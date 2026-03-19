package main

import (
	"os"
	"strings"

	"github.com/gofiber/contrib/v3/swaggo"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/samber/lo"
	"github.com/waifuvault/WaifuVault/shared/middleware"
	"github.com/waifuvault/WaifuVault/shared/utils"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/controllers"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dao"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/routes"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/thumbnail"
	"golang.org/x/net/context"

	"github.com/waifuvault/WaifuVault/thumbnails/docs"
	_ "github.com/waifuvault/WaifuVault/thumbnails/docs"
)

// @title           Thumbnail Service API
// @version         1.0
// @description     A service for generating thumbnails from images and videos using libvips and ffmpeg
// @termsOfService  http://swagger.io/terms/

// @contact.name   Victoria
// @contact.url    https://x.com/VictoriqueM
// @contact.email  victoria@waifuvault.moe

// @license.name  MIT
// @license.url   https://opensource.org/licenses/MIT

// @BasePath  /api/v1

// @schemes   https http

// @tag.name thumbnails
// @tag.description Operations for generating and managing thumbnails
func main() {
	configureLog()

	utils.LoadEnvs()

	configureSwaggerServers()

	rdb := initRedis()

	app := fiber.New(fiber.Config{
		BodyLimit: thumbnail.BodyLimit,
	})

	mainDao, err := dao.NewDao(rdb)
	if err != nil {
		panic(err)
	}

	service := controllers.NewService(mainDao, rdb)

	middleware.SetupCommonMiddleware(app)

	app.Get("/*", static.New("./static"))

	app.Get("/swagger/*", swaggo.HandlerDefault)

	routes.PublicRoutes(*service, app)

	if os.Getenv("STAGE_STATUS") == "dev" {
		utils.StartServer(app)
	} else {
		utils.StartServerWithGracefulShutdown(app)
	}
}

func configureSwaggerServers() {
	baseUrl := GetBseUrl()
	baseUrl = strings.TrimPrefix(baseUrl, "https://")
	baseUrl = strings.TrimPrefix(baseUrl, "http://")
	docs.SwaggerInfo.Host = baseUrl
	log.Info().Msgf("Configured Swagger for %s mode", baseUrl)
}

func initRedis() *redis.Client {
	rawRedisUri := lo.Ternary(utils.DockerMode, os.Getenv("REDIS_URI"), "redis://redis:6379")
	redisAddr := strings.TrimPrefix(rawRedisUri, "redis://")

	client := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	pong, err := client.Ping(context.Background()).Result()
	if err != nil {
		log.Error().Err(err).Msg("failed to connect to Redis")
		panic(err)
	} else {
		log.Info().Str("response", pong).Msg("successfully connected to Redis")
	}

	return client
}

func configureLog() {
	if utils.DockerMode {
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	} else {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
}

func GetBseUrl() string {
	if os.Getenv("NODE_ENV") == "development" {
		return "http://127.0.0.1:8080"
	}
	return os.Getenv("THUMBNAIL_SERVICE_BASE_URL")
}
