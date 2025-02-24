package dao

import (
	"errors"
	"fmt"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"os"
)

type Dao interface {
	ThumbnailDao
}
type dao struct {
	db *gorm.DB
}

func NewDao() (Dao, error) {
	connection, err := getConnection()
	if err != nil {
		return nil, err
	}

	return &dao{
		db: connection,
	}, nil
}

func getConnection() (*gorm.DB, error) {
	dbType := os.Getenv("DATABASE_TYPE")
	if dbType == "" {
		return nil, errors.New("db type must be defined")
	}

	if dbType == "sqlite" {
		return gorm.Open(sqlite.Open("main.db"), &gorm.Config{})
	}

	user := os.Getenv("POSTGRES_USER")
	password := os.Getenv("POSTGRES_PASSWORD")
	port := os.Getenv("POSTGRES_PORT")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=gorm port=%s sslmode=disable TimeZone=Etc/UTC", "localhost", user, password, port)

	return gorm.Open(postgres.Open(dsn), &gorm.Config{})

}

func (d dao) getDb(tx ...*gorm.DB) *gorm.DB {
	db := d.db
	if len(tx) == 1 {
		db = tx[0]
	}
	return db
}
