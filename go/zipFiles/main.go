package main

import (
	"os"

	"github.com/create-go-app/fiber-go-template/pkg/configs"
	"github.com/create-go-app/fiber-go-template/pkg/routes"
	"github.com/gofiber/fiber/v2"
	"github.com/waifuvault/WaifuVault/shared/middleware"
	"github.com/waifuvault/WaifuVault/shared/utils"
	"github.com/waifuvault/WaifuVault/zipfiles/pkg/controllers"
	waifuRoutes "github.com/waifuvault/WaifuVault/zipfiles/pkg/routes"
)

func main() {
	// load env
	utils.LoadEnvs()

	// Define Fiber config.
	config := configs.FiberConfig()

	// Define a new Fiber app with config.
	app := fiber.New(config)

	// services
	service := controllers.NewService()

	// Middlewares.
	middleware.SetupCommonMiddleware(app)

	// Routes.
	waifuRoutes.PublicRoutes(*service, app) // Register a public routes for app.
	routes.NotFoundRoute(app)               // Register route for 404 Error.

	if os.Getenv("STAGE_STATUS") == "dev" {
		utils.StartServer(app)
	} else {
		utils.StartServerWithGracefulShutdown(app)
	}
}
