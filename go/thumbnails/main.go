package main

import (
	"fmt"
	"github.com/davidbyttow/govips/v2/vips"
	"github.com/waifuvault/WaifuVault/pkg/utils"
	"os"
)

func main() {
	vips.Startup(nil)
	defer vips.Shutdown()
	// Load the image from file by reading its bytes.
	data, err := os.ReadFile(utils.BaseUrl + "/curse-of-ra-curse.gif")
	checkError(err)

	intSet := vips.IntParameter{}
	intSet.Set(-1)
	params := vips.NewImportParams()
	params.NumPages = intSet

	image1, err := vips.LoadImageFromBuffer(data, params)
	checkError(err)

	// Rotate the picture upright and reset EXIF orientation tag.
	err = image1.AutoRotate()
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
