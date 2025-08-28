package main

import (
	"os"
	"strings"

	"github.com/create-go-app/fiber-go-template/pkg/configs"
	"github.com/create-go-app/fiber-go-template/pkg/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/samber/lo"
	"github.com/swaggo/fiber-swagger"
	"github.com/waifuvault/WaifuVault/shared/utils"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/controllers"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dao"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/routes"
	"golang.org/x/net/context"

	"github.com/waifuvault/WaifuVault/thumbnails/docs"
	_ "github.com/waifuvault/WaifuVault/thumbnails/docs" // This line is needed for swag
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

// @schemes   http https

// @tag.name thumbnails
// @tag.description Operations for generating and managing thumbnails
func main() {
	// configure zero log
	configureLog()

	// load env
	utils.LoadEnvs()

	// Configure Swagger based on environment
	configureSwaggerServers()

	rdb := initRedis()

	// Define Fiber config.
	config := configs.FiberConfig()
	config.BodyLimit = 100 * 1024 * 1024

	// Define a new Fiber app with config.
	app := fiber.New(config)

	// dao
	mainDao, err := dao.NewDao(rdb)
	if err != nil {
		panic(err)
	}

	// services
	service := controllers.NewService(mainDao)

	// Middlewares.
	middleware.FiberMiddleware(app) // Register Fiber's middleware for app.

	// Swagger documentation
	app.Get("/swagger/*", fiberSwagger.WrapHandler)

	// Routes.
	routes.PublicRoutes(*service, app)

	if os.Getenv("STAGE_STATUS") == "dev" {
		utils.StartServer(app)
	} else {
		utils.StartServerWithGracefulShutdown(app)
	}
}

func configureSwaggerServers() {
	// Configure servers based on environment by modifying the SwaggerInfo
	baseUrl := utils.GetBseUrl()
	// remove http(s):// from the start
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
