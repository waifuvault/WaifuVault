package main

import (
	"os"

	"github.com/gofiber/fiber/v3"
	"github.com/waifuvault/WaifuVault/shared/middleware"
	"github.com/waifuvault/WaifuVault/shared/utils"
	"github.com/waifuvault/WaifuVault/zipfiles/pkg/controllers"
	waifuRoutes "github.com/waifuvault/WaifuVault/zipfiles/pkg/routes"
)

func main() {
	utils.LoadEnvs()

	app := fiber.New()

	service := controllers.NewService()

	middleware.SetupCommonMiddleware(app)

	waifuRoutes.PublicRoutes(*service, app)

	app.Use(func(ctx fiber.Ctx) error {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": true,
			"msg":   "endpoint not found",
		})
	})

	if os.Getenv("STAGE_STATUS") == "dev" {
		utils.StartServer(app)
	} else {
		utils.StartServerWithGracefulShutdown(app)
	}
}
