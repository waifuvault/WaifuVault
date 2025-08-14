package utils

import (
	"os"
	"os/signal"
	"runtime"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

// StartServerWithGracefulShutdown function for starting server with a graceful shutdown.
func StartServerWithGracefulShutdown(a *fiber.App) {
	idleConnsClosed := make(chan struct{})
	go func() {
		sigint := make(chan os.Signal, 1)
		signal.Notify(sigint, os.Interrupt)
		<-sigint

		if err := a.Shutdown(); err != nil {
			// Error from closing listeners, or context timeout:
			printError(err)
		}
		close(idleConnsClosed)
	}()

	fiberConnURL := ConnectionURL()
	printGoVersion()

	if err := a.Listen(fiberConnURL); err != nil {
		printError(err)
	}

	<-idleConnsClosed
}

func StartServer(a *fiber.App) {
	fiberConnURL := ConnectionURL()
	printGoVersion()
	if err := a.Listen(fiberConnURL); err != nil {
		printError(err)
	}
}

func printError(err error) {
	log.Err(err).Msgf("Oops... Server is not running!")
}

func printGoVersion() {
	log.Info().Msgf("Go Version: %s", runtime.Version())
}
