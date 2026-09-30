package dto

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
)

func TestFromModel_CopiesStorageBackend(t *testing.T) {
	// given
	model := mod.FileEntry{
		Id:             7,
		MediaType:      "image/png",
		Extension:      "png",
		FileName:       "abc",
		StorageBackend: "s3",
	}

	// when
	result := FromModel(model)

	// then
	assert.Equal(t, 7, result.Id)
	assert.Equal(t, "abc.png", result.FullFileNameOnSystem)
	assert.Equal(t, "image/png", result.MediaType)
	assert.Equal(t, "png", result.Extension)
	assert.Equal(t, "s3", result.StorageBackend)
}
