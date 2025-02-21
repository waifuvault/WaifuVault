package controllers

import (
	"errors"
	"fmt"
	"github.com/gofiber/fiber/v2"
	"github.com/waifuvault/WaifuVault/pkg/mod"
	"github.com/waifuvault/WaifuVault/pkg/wapimod"
)

func (s *Service) getAllZipRoutes() []FSetupRoute {
	return []FSetupRoute{
		s.setupZipFilesRoute,
	}
}

func (s *Service) setupZipFilesRoute(routeGroup fiber.Router) {
	routeGroup.Post("/zipFiles", s.zipFiles)
}

func (s *Service) zipFiles(ctx *fiber.Ctx) error {
	var filesToZip []mod.ZipFileEntry
	if err := ctx.BodyParser(&filesToZip); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(wapimod.NewApiError("invalid payload", err))
	}

	albumName := ctx.Query("albumName")
	if albumName == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(wapimod.NewApiError("album name not specified", errors.New("album name not specified")))
	}

	result, err := s.ZipService.ZipFiles(albumName, filesToZip)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(wapimod.NewApiError("error zipping files", err))
	}
	return ctx.Status(fiber.StatusOK).JSON(wapimod.NewApiResult(fmt.Sprintf(result), true))
}
