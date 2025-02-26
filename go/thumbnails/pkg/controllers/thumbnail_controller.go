package controllers

import (
	"fmt"
	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/wapimod"
	"time"
)

func (s *Service) getAllThumbnailRoutes() []FSetupRoute {
	return []FSetupRoute{
		s.setupGenerateThumbnailsRoute,
		s.setupGetAllSupportedImageExtensionsRoute,
	}
}

func (s *Service) setupGetAllSupportedImageExtensionsRoute(routeGroup fiber.Router) {
	routeGroup.Get("/generateThumbnails/image/supported", s.getAllSupportedImageExtensionsRoute)
}

func (s *Service) getAllSupportedImageExtensionsRoute(ctx *fiber.Ctx) error {
	fileTypes := s.ThumbnailService.GetAllSupportedImageExtensions()

	return ctx.Status(fiber.StatusOK).JSON(fileTypes)
}

func (s *Service) setupGenerateThumbnailsRoute(routeGroup fiber.Router) {
	routeGroup.Post("/generateThumbnails", s.generateThumbnails)
}

func (s *Service) generateThumbnails(ctx *fiber.Ctx) error {
	var thumbnailEntries []mod.FileEntry
	if err := ctx.BodyParser(&thumbnailEntries); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(wapimod.NewApiError("invalid payload", err))
	}
	go func() {
		start := time.Now()
		err := s.ThumbnailService.GenerateThumbnails(thumbnailEntries)
		elapsed := time.Since(start)
		fmt.Printf("GenerateThumbnails took %s\n", elapsed)
		if err != nil {
			log.Error().Err(err).Msg("error generating thumbnails")
		}
	}()
	return ctx.Status(fiber.StatusOK).JSON(wapimod.NewApiResult("", true))
}
