package mod

type FileEntry struct {
	Id                   int    `json:"id"`
	FullFileNameOnSystem string `json:"fileOnDisk"`
	MediaType            string `json:"mediaType"`
	Extension            string `json:"extension"`
}
