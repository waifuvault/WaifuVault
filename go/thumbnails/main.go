package main

import (
	"github.com/create-go-app/fiber-go-template/pkg/configs"
	"github.com/create-go-app/fiber-go-template/pkg/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
	"github.com/samber/lo"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/controllers"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dao"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/routes"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/utils"
	"golang.org/x/net/context"
	"os"
	"strings"
)

func main() {
	// load env
	utils.LoadEnvs()

	rdb := initRedis()

	// Define Fiber config.
	config := configs.FiberConfig()

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

	// Routes.
	routes.PublicRoutes(*service, app)

	if os.Getenv("STAGE_STATUS") == "dev" {
		utils.StartServer(app)
	} else {
		utils.StartServerWithGracefulShutdown(app)
	}
}

func initRedis() *redis.Client {
	rawRedisUri := lo.Ternary(utils.DevMode, os.Getenv("REDIS_URI"), "redis://redis:6379")
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
