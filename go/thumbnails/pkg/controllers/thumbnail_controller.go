package controllers

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
	"github.com/waifuvault/WaifuVault/shared/utils"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/wapimod"
)

func (s *Service) getAllThumbnailRoutes() []FSetupRoute {
	return []FSetupRoute{
		s.setupGenerateThumbnailsRoute,
		s.setupGetAllSupportedExtensionsRoute,
		s.setupUploadFileRoute,
	}
}

// GetAllSupportedExtensions godoc
//
//	@Summary		Get supported file extensions
//	@Description	Returns a list of all file extensions supported by the thumbnail service for both images and videos
//	@Tags			thumbnails
//	@Accept			json
//	@Produce		json
//	@Success		200	{array}	string	"List of supported file extensions"
//	@Router			/generateThumbnails/supported [get]
func (s *Service) setupGetAllSupportedExtensionsRoute(routeGroup fiber.Router) {
	routeGroup.Get("/generateThumbnails/supported", s.getAllSupportedExtensionsRoute)
}

func (s *Service) getAllSupportedExtensionsRoute(ctx *fiber.Ctx) error {
	fileTypes := s.ThumbnailService.GetAllSupportedExtensions()

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

// Generate thumbnail godoc
//
//	@Summary	Upload a file
//	@Description	Accepts a file upload via multipart form data
//	@Tags	thumbnails
//	@Accept	multipart/form-data
//	@Produce	json
//	@Param	file	formData	file	true	"File to upload"
//	@Param	animate	query	bool	false	"set to true if you want to animate the thumbnail (only works with animated gif, webp or heif)"
//	@Success	200	{object}	map[string]interface{}	"File uploaded successfully"
//	@Failure	400	{object}	map[string]interface{}	"Bad request - no file uploaded"
//	@Router	/generateThumbnail [post]
func (s *Service) setupUploadFileRoute(routeGroup fiber.Router) {
	routeGroup.Post("/generateThumbnail", s.generateThumbnail)
}

func (s *Service) generateThumbnail(ctx *fiber.Ctx) error {
	fileHeader, err := ctx.FormFile("file")
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No file uploaded",
		})
	}

	animate := ctx.QueryBool("animate", true)

	thumbnail, err := s.ThumbnailService.GenerateThumbnail(fileHeader, animate)
	if err != nil {
		if strings.Contains(err.Error(), "unsupported file type") {
			return ctx.Status(fiber.StatusBadRequest).JSON(wapimod.NewApiError("unsupported file type", err))
		}
		return ctx.Status(fiber.StatusInternalServerError).JSON(wapimod.NewApiError("error generating thumbnail", err))
	}

	ctx.Set("Content-Length", fmt.Sprintf("%d", len(thumbnail)))
	ctx.Status(fiber.StatusOK)
	ctx.Set(fiber.HeaderContentType, "image/webp")

	return ctx.Send(thumbnail)
}
