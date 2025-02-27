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
	"os"
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
	redisUri := lo.Ternary(utils.DevMode, os.Getenv("REDIS_URI"), "redis://redis:6379")
	log.Info().Msg("connected to redis")
	return redis.NewClient(&redis.Options{
		Addr: redisUri,
	})
}
