package thumbnail

import (
	"encoding/base64"
	"errors"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dao"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dto"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
)

func TestNewBatchProcessor_CreatesProcessorWithDefaults(t *testing.T) {
	// given
	daoService := dao.NewMockDao(t)
	processor := NewMockProcessor(t)
	files := []dto.FileEntryDto{
		{Id: 1, MediaType: "image/jpeg", Extension: "jpg"},
	}
	albumID := 123

	// when
	bp := NewBatchProcessor(daoService, processor, files, albumID)

	// then
	assert.NotNil(t, bp)
	batchProc := bp.(*batchProcessor)
	assert.Equal(t, DefaultWorkerCount, batchProc.workerCount)
	assert.Equal(t, DefaultBatchSize, batchProc.batchSize)
	assert.Equal(t, albumID, batchProc.albumID)
	assert.Equal(t, files, batchProc.files)
}

func TestBatchProcessor_Process_AlreadyProcessing(t *testing.T) {
	// given
	daoService := dao.NewMockDao(t)
	processor := NewMockProcessor(t)
	files := []dto.FileEntryDto{}
	albumID := 456

	albumProcessing.Store(albumID, true)
	defer albumProcessing.Delete(albumID)

	bp := NewBatchProcessor(daoService, processor, files, albumID)

	// when
	err := bp.Process()

	// then
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already being processed")
}

func TestBatchProcessor_Process_EmptyFileList(t *testing.T) {
	// given
	daoService := dao.NewMockDao(t)
	processor := NewMockProcessor(t)
	files := []dto.FileEntryDto{}
	albumID := 789

	bp := NewBatchProcessor(daoService, processor, files, albumID)

	// when
	err := bp.Process()

	// then
	assert.NoError(t, err)
}

func TestBatchProcessor_Process_SingleFile(t *testing.T) {
	// given
	daoService := dao.NewMockDao(t)
	processor := NewMockProcessor(t)
	files := []dto.FileEntryDto{
		{
			Id:                   1,
			MediaType:            "image/jpeg",
			Extension:            "jpg",
			FullFileNameOnSystem: "test.jpg",
		},
	}
	albumID := 101

	expectedThumbnail := []byte("thumbnail-data")
	processor.On("SupportsFile", files[0]).Return(true)
	processor.On("GenerateThumbnail", files[0], false).Return(expectedThumbnail, nil)

	daoService.On("SaveThumbnails", mock.MatchedBy(func(thumbnails []mod.Thumbnail) bool {
		return len(thumbnails) == 1 &&
			thumbnails[0].FileId == 1 &&
			thumbnails[0].Data == base64.StdEncoding.EncodeToString(expectedThumbnail)
	})).Return([]mod.Thumbnail{{FileId: 1}}, nil)

	bp := NewBatchProcessor(daoService, processor, files, albumID)

	// when
	err := bp.Process()

	// then
	assert.NoError(t, err)
	processor.AssertExpectations(t)
	daoService.AssertExpectations(t)
}

func TestBatchProcessor_Process_MultipleFiles(t *testing.T) {
	// given
	daoService := dao.NewMockDao(t)
	processor := NewMockProcessor(t)
	files := []dto.FileEntryDto{
		{Id: 1, MediaType: "image/jpeg", Extension: "jpg", FullFileNameOnSystem: "test1.jpg"},
		{Id: 2, MediaType: "image/png", Extension: "png", FullFileNameOnSystem: "test2.png"},
		{Id: 3, MediaType: "image/gif", Extension: "gif", FullFileNameOnSystem: "test3.gif"},
	}
	albumID := 202

	for _, file := range files {
		processor.On("SupportsFile", file).Return(true)
		processor.On("GenerateThumbnail", file, false).Return([]byte("thumbnail"), nil)
	}

	daoService.On("SaveThumbnails", mock.MatchedBy(func(thumbnails []mod.Thumbnail) bool {
		return len(thumbnails) == 3
	})).Return(make([]mod.Thumbnail, 3), nil)

	bp := NewBatchProcessor(daoService, processor, files, albumID)

	// when
	err := bp.Process()

	// then
	assert.NoError(t, err)
	processor.AssertExpectations(t)
	daoService.AssertExpectations(t)
}

func TestBatchProcessor_Process_UnsupportedFileSkipped(t *testing.T) {
	// given
	daoService := dao.NewMockDao(t)
	processor := NewMockProcessor(t)
	files := []dto.FileEntryDto{
		{Id: 1, MediaType: "image/jpeg", Extension: "jpg", FullFileNameOnSystem: "test1.jpg"},
		{Id: 2, MediaType: "text/plain", Extension: "txt", FullFileNameOnSystem: "test2.txt"},
		{Id: 3, MediaType: "image/png", Extension: "png", FullFileNameOnSystem: "test3.png"},
	}
	albumID := 303

	processor.On("SupportsFile", files[0]).Return(true)
	processor.On("GenerateThumbnail", files[0], false).Return([]byte("thumbnail1"), nil)
	processor.On("SupportsFile", files[1]).Return(false)
	processor.On("SupportsFile", files[2]).Return(true)
	processor.On("GenerateThumbnail", files[2], false).Return([]byte("thumbnail3"), nil)

	daoService.On("SaveThumbnails", mock.MatchedBy(func(thumbnails []mod.Thumbnail) bool {
		return len(thumbnails) == 2
	})).Return(make([]mod.Thumbnail, 2), nil)

	bp := NewBatchProcessor(daoService, processor, files, albumID)

	// when
	err := bp.Process()

	// then
	assert.NoError(t, err)
	processor.AssertExpectations(t)
	daoService.AssertExpectations(t)
}

func TestBatchProcessor_Process_GenerateThumbnailError(t *testing.T) {
	// given
	daoService := dao.NewMockDao(t)
	processor := NewMockProcessor(t)
	files := []dto.FileEntryDto{
		{Id: 1, MediaType: "image/jpeg", Extension: "jpg", FullFileNameOnSystem: "test1.jpg"},
		{Id: 2, MediaType: "image/png", Extension: "png", FullFileNameOnSystem: "test2.png"},
	}
	albumID := 404

	processor.On("SupportsFile", files[0]).Return(true)
	processor.On("GenerateThumbnail", files[0], false).Return(nil, errors.New("generation failed"))
	processor.On("SupportsFile", files[1]).Return(true)
	processor.On("GenerateThumbnail", files[1], false).Return([]byte("thumbnail2"), nil)

	daoService.On("SaveThumbnails", mock.MatchedBy(func(thumbnails []mod.Thumbnail) bool {
		return len(thumbnails) == 1 && thumbnails[0].FileId == 2
	})).Return([]mod.Thumbnail{{FileId: 2}}, nil)

	bp := NewBatchProcessor(daoService, processor, files, albumID)

	// when
	err := bp.Process()

	// then
	assert.NoError(t, err)
	processor.AssertExpectations(t)
	daoService.AssertExpectations(t)
}

func TestBatchProcessor_Process_SaveThumbnailsError(t *testing.T) {
	// given
	daoService := dao.NewMockDao(t)
	processor := NewMockProcessor(t)
	files := []dto.FileEntryDto{
		{Id: 1, MediaType: "image/jpeg", Extension: "jpg", FullFileNameOnSystem: "test.jpg"},
	}
	albumID := 505

	processor.On("SupportsFile", files[0]).Return(true)
	processor.On("GenerateThumbnail", files[0], false).Return([]byte("thumbnail"), nil)
	daoService.On("SaveThumbnails", mock.Anything).Return([]mod.Thumbnail{}, errors.New("database error"))

	bp := NewBatchProcessor(daoService, processor, files, albumID)

	// when
	err := bp.Process()

	// then
	assert.NoError(t, err)
	processor.AssertExpectations(t)
	daoService.AssertExpectations(t)
}

func TestBatchProcessor_Process_BatchSizeReached(t *testing.T) {
	// given
	daoService := dao.NewMockDao(t)
	processor := NewMockProcessor(t)

	files := make([]dto.FileEntryDto, 55)
	for i := 0; i < 55; i++ {
		files[i] = dto.FileEntryDto{
			Id:                   i + 1,
			MediaType:            "image/jpeg",
			Extension:            "jpg",
			FullFileNameOnSystem: "test.jpg",
		}
		processor.On("SupportsFile", files[i]).Return(true)
		processor.On("GenerateThumbnail", files[i], false).Return([]byte("thumbnail"), nil)
	}
	albumID := 606

	daoService.On("SaveThumbnails", mock.MatchedBy(func(thumbnails []mod.Thumbnail) bool {
		return len(thumbnails) == DefaultBatchSize
	})).Return(make([]mod.Thumbnail, DefaultBatchSize), nil).Once()

	daoService.On("SaveThumbnails", mock.MatchedBy(func(thumbnails []mod.Thumbnail) bool {
		return len(thumbnails) == 5
	})).Return(make([]mod.Thumbnail, 5), nil).Once()

	bp := NewBatchProcessor(daoService, processor, files, albumID)

	// when
	err := bp.Process()

	// then
	assert.NoError(t, err)
	processor.AssertExpectations(t)
	daoService.AssertExpectations(t)
}

func TestBatchProcessor_ThumbnailWorker_ProcessesFiles(t *testing.T) {
	// given
	processor := NewMockProcessor(t)
	file := dto.FileEntryDto{
		Id:                   1,
		MediaType:            "image/jpeg",
		Extension:            "jpg",
		FullFileNameOnSystem: "test.jpg",
	}

	expectedThumbnail := []byte("thumbnail-data")
	processor.On("SupportsFile", file).Return(true)
	processor.On("GenerateThumbnail", file, false).Return(expectedThumbnail, nil)

	bp := &batchProcessor{
		processor: processor,
	}

	filesChan := make(chan dto.FileEntryDto, 1)
	resultsChan := make(chan mod.Thumbnail, 1)
	var wg sync.WaitGroup

	filesChan <- file
	close(filesChan)

	wg.Add(1)

	// when
	go bp.thumbnailWorker(&wg, filesChan, resultsChan)
	wg.Wait()
	close(resultsChan)

	// then
	result := <-resultsChan
	assert.Equal(t, file.Id, result.FileId)
	assert.Equal(t, base64.StdEncoding.EncodeToString(expectedThumbnail), result.Data)
	processor.AssertExpectations(t)
}

func TestBatchProcessor_BatchProcess_SavesBatches(t *testing.T) {
	// given
	daoService := dao.NewMockDao(t)

	thumbnails := make([]mod.Thumbnail, 55)
	for i := 0; i < 55; i++ {
		thumbnails[i] = mod.Thumbnail{
			FileId: i + 1,
			Data:   "thumbnail-data",
		}
	}

	daoService.On("SaveThumbnails", mock.MatchedBy(func(batch []mod.Thumbnail) bool {
		return len(batch) == DefaultBatchSize
	})).Return(make([]mod.Thumbnail, DefaultBatchSize), nil).Once()

	daoService.On("SaveThumbnails", mock.MatchedBy(func(batch []mod.Thumbnail) bool {
		return len(batch) == 5
	})).Return(make([]mod.Thumbnail, 5), nil).Once()

	bp := &batchProcessor{
		dao:       daoService,
		batchSize: DefaultBatchSize,
	}

	resultsChan := make(chan mod.Thumbnail, 55)
	done := make(chan struct{})

	for _, thumb := range thumbnails {
		resultsChan <- thumb
	}
	close(resultsChan)

	// when
	go bp.batchProcess(resultsChan, done)
	<-done

	// then
	daoService.AssertExpectations(t)
}

func TestBatchProcessor_BatchProcess_SavesRemainingThumbnails(t *testing.T) {
	// given
	daoService := dao.NewMockDao(t)

	thumbnails := make([]mod.Thumbnail, 3)
	for i := 0; i < 3; i++ {
		thumbnails[i] = mod.Thumbnail{
			FileId: i + 1,
			Data:   "thumbnail-data",
		}
	}

	daoService.On("SaveThumbnails", mock.MatchedBy(func(batch []mod.Thumbnail) bool {
		return len(batch) == 3
	})).Return(make([]mod.Thumbnail, 3), nil).Once()

	bp := &batchProcessor{
		dao:       daoService,
		batchSize: DefaultBatchSize,
	}

	resultsChan := make(chan mod.Thumbnail, 3)
	done := make(chan struct{})

	for _, thumb := range thumbnails {
		resultsChan <- thumb
	}
	close(resultsChan)

	// when
	go bp.batchProcess(resultsChan, done)
	<-done

	// then
	daoService.AssertExpectations(t)
}

func TestBatchProcessor_Process_CleansUpAlbumProcessingFlag(t *testing.T) {
	// given
	daoService := dao.NewMockDao(t)
	processor := NewMockProcessor(t)
	files := []dto.FileEntryDto{}
	albumID := 999

	bp := NewBatchProcessor(daoService, processor, files, albumID)

	// when
	err := bp.Process()

	// then
	assert.NoError(t, err)
	_, loaded := albumProcessing.Load(albumID)
	assert.False(t, loaded)
}
