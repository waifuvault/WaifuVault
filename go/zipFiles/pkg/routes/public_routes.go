package routes

import (
	"github.com/gofiber/fiber/v3"
	"github.com/waifuvault/WaifuVault/zipfiles/pkg/controllers"
)

func PublicRoutes(s controllers.Service, app *fiber.App) {
	routes := s.GetAllRoutes()
	router := app.Group("/api/v1")
	for _, pRoute := range routes {
		pRoute(router)
	}
}
