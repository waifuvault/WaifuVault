package mod

type ZipFileEntry struct {
	FullFileNameOnSystem string `json:"fileOnDisk"`
	ParsedFilename       string `json:"parsedFilename"`
}
