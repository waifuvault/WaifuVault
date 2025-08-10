package controllers

import (
	"errors"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
	"github.com/waifuvault/WaifuVault/shared/utils"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/wapimod"
)

// GetAllSupportedExtensions godoc
//
//	@Summary		Get supported file extensions
//	@Description	Returns a list of all file extensions supported by the thumbnail service for both images and videos
//	@Tags			thumbnails
//	@Accept			json
//	@Produce		json
//	@Success		200	{array}	string	"List of supported file extensions"
//	@Router			/generateThumbnails/supported [get]
func (s *Service) getAllThumbnailRoutes() []FSetupRoute {
	return []FSetupRoute{
		s.setupGenerateThumbnailsRoute,
		s.setupGetAllSupportedExtensionsRoute,
	}
}

func (s *Service) setupGetAllSupportedExtensionsRoute(routeGroup fiber.Router) {
	routeGroup.Get("/generateThumbnails/supported", s.getAllSupportedExtensionsRoute)
}

func (s *Service) getAllSupportedExtensionsRoute(ctx *fiber.Ctx) error {
	fileTypes := s.ThumbnailService.GetAllSupportedExtensions()

	return ctx.Status(fiber.StatusOK).JSON(fileTypes)
}

// GenerateThumbnails godoc
//
//	@Summary		Generate thumbnails
//	@Description	Processes a batch of files to generate thumbnails. The operation runs asynchronously in the background.
//	@Tags			thumbnails
//	@Accept			json
//	@Produce		json
//	@Param	albumId					query		int					true	"The ID of the album to generate thumbnails for"		minimum(1)
//	@Param			addingAdditionalFiles	query		bool				false	"Whether adding additional files to an existing album"	default(false)
//	@Param			files					body		[]mod.FileEntry		true	"Array of file entries to process"
//	@Success	200						{object}	wapimod.ApiResult	"Thumbnail generation started successfully"
//	@Failure		400						{object}	wapimod.ApiResult	"Bad request - invalid payload or missing albumId"
//	@Router			/generateThumbnails [post]
func (s *Service) setupGenerateThumbnailsRoute(routeGroup fiber.Router) {
	routeGroup.Post("/generateThumbnails", s.generateThumbnails)
}

func (s *Service) generateThumbnails(ctx *fiber.Ctx) error {
	var thumbnailEntries []mod.FileEntry
	if err := ctx.BodyParser(&thumbnailEntries); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(wapimod.NewApiError("invalid payload", err))
	}

	var albumId int
	if albumId = ctx.QueryInt("albumId"); albumId == 0 {
		return ctx.Status(fiber.StatusBadRequest).JSON(wapimod.NewApiError("albumId name not specified", errors.New("albumId name not specified")))
	}

	addingAdditionalFiles := ctx.QueryBool("addingAdditionalFiles", false)

	if !addingAdditionalFiles && s.ThumbnailService.IsAlbumLoading(albumId) {
		errMsg := fmt.Sprintf("albumId %d is currently loading", albumId)
		return ctx.Status(fiber.StatusBadRequest).JSON(wapimod.NewApiError(errMsg, errors.New(errMsg)))
	}

	go func() {
		var start time.Time
		if utils.DockerMode {
			start = time.Now()
		}
		err := s.ThumbnailService.GenerateThumbnails(thumbnailEntries, albumId)
		if utils.DockerMode {
			log.Debug().Msgf("time taken to generate thumbnails: %s", time.Since(start))
		}
		if err != nil {
			log.Error().Err(err).Msg("error generating thumbnails")
		}
	}()
	return ctx.Status(fiber.StatusOK).JSON(wapimod.NewApiResult("", true))
}
