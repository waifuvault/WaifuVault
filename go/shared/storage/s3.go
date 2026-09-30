package storage

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/smithy-go"
	"github.com/rs/zerolog/log"
)

type (
	s3Settings struct {
		endpoint        string
		region          string
		bucket          string
		accessKeyID     string
		secretAccessKey string
		prefix          string
		forcePathStyle  bool
	}

	s3Store struct {
		client    *s3.Client
		presigner *s3.PresignClient
		bucket    string
		prefix    string
	}
)

const (
	presignExpiry = 15 * time.Minute
)

var (
	ErrS3NotConfigured = errors.New("s3 storage is not configured")

	loadS3Store = sync.OnceValues(newS3Store)
)

func loadS3Settings() (s3Settings, error) {
	settings := s3Settings{
		endpoint:        os.Getenv("S3_ENDPOINT"),
		region:          os.Getenv("S3_REGION"),
		bucket:          os.Getenv("S3_BUCKET"),
		accessKeyID:     os.Getenv("S3_ACCESS_KEY_ID"),
		secretAccessKey: os.Getenv("S3_SECRET_ACCESS_KEY"),
		prefix:          os.Getenv("S3_PREFIX"),
	}

	if rawPathStyle := os.Getenv("S3_FORCE_PATH_STYLE"); rawPathStyle != "" {
		forcePathStyle, err := strconv.ParseBool(rawPathStyle)
		if err != nil {
			return s3Settings{}, fmt.Errorf("%w: invalid S3_FORCE_PATH_STYLE %q", ErrS3NotConfigured, rawPathStyle)
		}
		settings.forcePathStyle = forcePathStyle
	}

	if settings.bucket == "" {
		return s3Settings{}, fmt.Errorf("%w: S3_BUCKET is not set", ErrS3NotConfigured)
	}
	if settings.region == "" {
		return s3Settings{}, fmt.Errorf("%w: S3_REGION is not set", ErrS3NotConfigured)
	}
	if (settings.accessKeyID == "") != (settings.secretAccessKey == "") {
		return s3Settings{}, fmt.Errorf("%w: S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set together", ErrS3NotConfigured)
	}

	return settings, nil
}

func newS3Store() (*s3Store, error) {
	settings, err := loadS3Settings()
	if err != nil {
		return nil, err
	}

	options := []func(*config.LoadOptions) error{
		config.WithRegion(settings.region),
		config.WithRequestChecksumCalculation(aws.RequestChecksumCalculationWhenRequired),
		config.WithResponseChecksumValidation(aws.ResponseChecksumValidationWhenRequired),
	}
	if settings.accessKeyID != "" {
		provider := credentials.NewStaticCredentialsProvider(settings.accessKeyID, settings.secretAccessKey, "")
		options = append(options, config.WithCredentialsProvider(provider))
	}

	awsConfig, err := config.LoadDefaultConfig(context.Background(), options...)
	if err != nil {
		return nil, fmt.Errorf("load s3 config: %w", err)
	}

	client := s3.NewFromConfig(awsConfig, func(o *s3.Options) {
		if settings.endpoint != "" {
			o.BaseEndpoint = aws.String(settings.endpoint)
		}
		o.UsePathStyle = settings.forcePathStyle
	})

	log.Info().
		Str("endpoint", settings.endpoint).
		Str("region", settings.region).
		Str("bucket", settings.bucket).
		Bool("forcePathStyle", settings.forcePathStyle).
		Msg("s3 storage client configured")

	return &s3Store{
		client:    client,
		presigner: s3.NewPresignClient(client),
		bucket:    settings.bucket,
		prefix:    settings.prefix,
	}, nil
}

func (s *s3Store) open(ctx context.Context, key string) (*Object, error) {
	objectKey := ObjectKey(s.prefix, key)
	output, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(objectKey),
	})
	if err != nil {
		if isS3NotFound(err) {
			return nil, &NotFoundError{Backend: S3, Key: objectKey, Err: err}
		}
		return nil, fmt.Errorf("get s3 object %q: %w", objectKey, err)
	}

	return &Object{
		ReadCloser: output.Body,
		Size:       aws.ToInt64(output.ContentLength),
		ModTime:    aws.ToTime(output.LastModified),
	}, nil
}

func (s *s3Store) presign(ctx context.Context, key string) (string, error) {
	objectKey := ObjectKey(s.prefix, key)
	request, err := s.presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(objectKey),
	}, s3.WithPresignExpires(presignExpiry))
	if err != nil {
		return "", fmt.Errorf("presign s3 object %q: %w", objectKey, err)
	}

	return request.URL, nil
}

func isS3NotFound(err error) bool {
	var apiErr smithy.APIError
	if !errors.As(err, &apiErr) {
		return false
	}

	code := apiErr.ErrorCode()
	return code == "NoSuchKey" || code == "NotFound"
}
