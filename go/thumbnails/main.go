package main

import (
	"github.com/create-go-app/fiber-go-template/pkg/configs"
	"github.com/create-go-app/fiber-go-template/pkg/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/controllers"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dao"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/routes"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/utils"
	"os"
)

func main() {
	// load env
	utils.LoadEnvs()

	// Define Fiber config.
	config := configs.FiberConfig()

	// Define a new Fiber app with config.
	app := fiber.New(config)

	// dao
	mainDao, err := dao.NewDao()
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

/*func main() {
	vips.Startup(nil)
	defer vips.Shutdown()
	// Load the image from file by reading its bytes.
	data, err := os.ReadFile(utils.BaseUrl + "/1349657509538.gif")
	checkError(err)

	intSet := vips.IntParameter{}
	intSet.Set(-1)
	params := vips.NewImportParams()
	params.NumPages = intSet

	image1, err := vips.LoadImageFromBuffer(data, params)
	checkError(err)

	err = applyScale(400.00, image1)
	checkError(err)

	// Rotate the picture upright and reset EXIF orientation tag.
	err = image1.AutoRotate()
	checkError(err)

	// remoeve metadata
	err = image1.RemoveMetadata("delay", "dispose", "loop", "loop_count")
	checkError(err)

	// Use the new JPEG export parameters function.
	image1bytes, _, err := image1.ExportNative()
	checkError(err)

	err = os.WriteFile(utils.BaseUrl+"/output.gif", image1bytes, 0644)
	checkError(err)
}

func checkError(err error) {
	if err != nil {
		fmt.Println("error:", err)
		os.Exit(1)
	}
}

func applyScale(width float64, img *vips.ImageRef) error {
	scale := width / float64(img.Width())
	return img.Resize(scale, vips.KernelAuto)
}*/
