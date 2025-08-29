package controllers

import (
	"github.com/gofiber/fiber/v2"
)

func (s *Service) getAllSystemRoutes() []FSetupRoute {
	return []FSetupRoute{
		s.setupHealthRoute,
	}
}

func (s *Service) setupHealthRoute(routeGroup fiber.Router) {
	routeGroup.Get("/health", s.healthCheck)
}

// HealthCheck godoc
// @Summary      Health check
// @Description  Returns the health status of the thumbnail service
// @Tags         system
// @Accept       json
// @Produce      json
// @Success      200  {object}  map[string]string  "Service health status"
// @Router       /health [get]
func (s *Service) healthCheck(ctx *fiber.Ctx) error {
	return ctx.JSON(fiber.Map{
		"status":  "ok",
		"service": "thumbnail-service",
	})
}
