package middleware

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/recover"
)

func SetupCommonMiddleware(app *fiber.App) {
	app.Use(recover.New())

	app.Use(SetupCORS())
}
