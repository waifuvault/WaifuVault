package mod

// FileEntry represents a file entry for thumbnail generation
type FileEntry struct {
	Id                   int    `json:"id" example:"1" validate:"required" description:"Unique identifier for the file"`
	FullFileNameOnSystem string `json:"fileOnDisk" example:"uploads/image.jpg" validate:"required" description:"Path to the file on the server"`
	MediaType            string `json:"mediaType" example:"image/jpeg" validate:"required" description:"MIME type of the file"`
	Extension            string `json:"extension" example:"jpg" validate:"required" description:"File extension"`
}
