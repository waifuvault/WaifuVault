package thumbnail

import (
	"encoding/base64"
	"fmt"
	"sync"

	"github.com/rs/zerolog/log"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dao"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
)

// BatchProcessor handles processing and saving thumbnails in batches
type BatchProcessor interface {
	Process() error
	thumbnailWorker(wg *sync.WaitGroup, filesChan <-chan mod.FileEntry, resultsChan chan<- mod.Thumbnail)
	batchProcess(resultsChan <-chan mod.Thumbnail, done chan<- struct{})
}

type batchProcessor struct {
	dao         dao.Dao
	processor   Processor
	files       []mod.FileEntry
	albumID     int
	workerCount int
	batchSize   int
}

// NewBatchProcessor creates a new batch processor
func NewBatchProcessor(daoService dao.Dao, processor Processor, files []mod.FileEntry, albumID int) BatchProcessor {
	return &batchProcessor{
		dao:         daoService,
		processor:   processor,
		files:       files,
		albumID:     albumID,
		workerCount: DefaultWorkerCount,
		batchSize:   DefaultBatchSize,
	}
}

// Process runs the batch thumbnail generation process
func (bp *batchProcessor) Process() error {
	if _, loaded := albumProcessing.LoadOrStore(bp.albumID, true); loaded {
		return fmt.Errorf("albumId %d is already being processed", bp.albumID)
	}
	// Ensure the processing flag is removed when done
	defer albumProcessing.Delete(bp.albumID)

	filesChan := make(chan mod.FileEntry)
	resultsChan := make(chan mod.Thumbnail)
	batchSaveDone := make(chan struct{})

	var wg sync.WaitGroup

	// Start worker goroutines
	for i := 0; i < bp.workerCount; i++ {
		wg.Add(1)
		go bp.thumbnailWorker(&wg, filesChan, resultsChan)
	}

	// Feed files to workers
	go func() {
		for _, f := range bp.files {
			filesChan <- f
		}
		close(filesChan)
	}()

	// Start batch processing goroutine
	go bp.batchProcess(resultsChan, batchSaveDone)

	// Wait for workers to finish
	go func() {
		wg.Wait()
		close(resultsChan)
	}()

	// Wait for batch processing to complete
	<-batchSaveDone

	return nil
}

// thumbnailWorker processes individual files and sends results to the result channel
func (bp *batchProcessor) thumbnailWorker(wg *sync.WaitGroup, filesChan <-chan mod.FileEntry, resultsChan chan<- mod.Thumbnail) {
	defer wg.Done()

	for file := range filesChan {
		if !bp.processor.SupportsFile(file) {
			continue
		}

		thumbnailBytes, err := bp.processor.GenerateThumbnail(file)
		if err != nil {
			log.Err(err).Msgf("failed to generate thumbnail for file %s", file.FullFileNameOnSystem)
			continue
		}

		resultsChan <- mod.Thumbnail{
			Data:   base64.StdEncoding.EncodeToString(thumbnailBytes),
			FileId: file.Id,
		}
	}
}

// batchProcessor collects thumbnails and saves them in batches
func (bp *batchProcessor) batchProcess(resultsChan <-chan mod.Thumbnail, done chan<- struct{}) {
	var batch []mod.Thumbnail
	batchCount := 0

	for thumbnail := range resultsChan {
		batch = append(batch, thumbnail)

		// When we reach batch size, save the batch
		if len(batch) >= bp.batchSize {
			batchToSave := make([]mod.Thumbnail, len(batch))
			copy(batchToSave, batch)

			// Save the batch
			_, err := bp.dao.SaveThumbnails(batchToSave)
			if err != nil {
				log.Err(err).Msgf("failed to save thumbnail batch %d", batchCount)
			} else {
				log.Debug().Msgf("saved thumbnail batch %d with %d thumbnails", batchCount, len(batchToSave))
			}

			// Reset the batch
			batch = []mod.Thumbnail{}
			batchCount++
		}
	}

	// Save any remaining thumbnails
	if len(batch) > 0 {
		_, err := bp.dao.SaveThumbnails(batch)
		if err != nil {
			log.Err(err).Msgf("failed to save final thumbnail batch")
		} else {
			log.Debug().Msgf("saved final thumbnail batch with %d thumbnails", len(batch))
		}
	}

	// Signal that all batches have been processed
	close(done)
}
