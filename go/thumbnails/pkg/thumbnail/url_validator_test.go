package thumbnail

import (
	"net"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateURL_ValidHTTPSURL(t *testing.T) {
	// given
	url := "https://example.com/image.jpg"

	// when
	err := validateURL(url)

	// then
	assert.NoError(t, err)
}

func TestValidateURL_ValidHTTPURL(t *testing.T) {
	// given
	url := "http://example.com/image.jpg"

	// when
	err := validateURL(url)

	// then
	assert.NoError(t, err)
}

func TestValidateURL_InvalidScheme(t *testing.T) {
	// given
	url := "ftp://example.com/file.txt"

	// when
	err := validateURL(url)

	// then
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported URL scheme")
}

func TestValidateURL_NoScheme(t *testing.T) {
	// given
	url := "example.com/image.jpg"

	// when
	err := validateURL(url)

	// then
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported URL scheme")
}

func TestValidateURL_MalformedURL(t *testing.T) {
	// given
	url := "ht!tp://invalid url with spaces"

	// when
	err := validateURL(url)

	// then
	assert.Error(t, err)
}

func TestValidateURL_NoHostname(t *testing.T) {
	// given
	url := "https://"

	// when
	err := validateURL(url)

	// then
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "URL must contain a hostname")
}

func TestValidateURL_LocalhostRejected(t *testing.T) {
	// given
	tests := []struct {
		name string
		url  string
	}{
		{
			name: "localhost with path",
			url:  "https://localhost/image.jpg",
		},
		{
			name: "localhost without path",
			url:  "https://localhost",
		},
		{
			name: "localhost with port",
			url:  "http://localhost:8080/image.jpg",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// when
			err := validateURL(tt.url)

			// then
			assert.Error(t, err)
			assert.Contains(t, err.Error(), "private or localhost")
		})
	}
}

func TestValidateURL_LoopbackIPRejected(t *testing.T) {
	// given
	url := "https://127.0.0.1/image.jpg"

	// when
	err := validateURL(url)

	// then
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "private or localhost")
}

func TestValidateURL_PrivateIPRejected(t *testing.T) {
	// given
	tests := []struct {
		name string
		url  string
	}{
		{
			name: "192.168.x.x range",
			url:  "https://192.168.1.1/image.jpg",
		},
		{
			name: "10.x.x.x range",
			url:  "https://10.0.0.1/image.jpg",
		},
		{
			name: "172.16-31.x.x range",
			url:  "https://172.16.0.1/image.jpg",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// when
			err := validateURL(tt.url)

			// then
			assert.Error(t, err)
			assert.Contains(t, err.Error(), "private or localhost")
		})
	}
}

func TestIsPrivateOrLocalhost_Localhost(t *testing.T) {
	// given
	hostname := "localhost"

	// when
	result := isPrivateOrLocalhost(hostname)

	// then
	assert.True(t, result)
}

func TestIsPrivateOrLocalhost_LoopbackIP(t *testing.T) {
	// given
	tests := []struct {
		name     string
		hostname string
	}{
		{name: "127.0.0.1", hostname: "127.0.0.1"},
		{name: "127.0.0.5", hostname: "127.0.0.5"},
		{name: "127.255.255.255", hostname: "127.255.255.255"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// when
			result := isPrivateOrLocalhost(tt.hostname)

			// then
			assert.True(t, result)
		})
	}
}

func TestIsPrivateOrLocalhost_PublicDomain(t *testing.T) {
	// given
	hostname := "example.com"

	// when
	result := isPrivateOrLocalhost(hostname)

	// then
	assert.False(t, result)
}

func TestIsPrivateOrLocalhost_InvalidHostname(t *testing.T) {
	// given
	hostname := "invalid-domain-that-does-not-exist-123456789.com"

	// when
	result := isPrivateOrLocalhost(hostname)

	// then
	assert.False(t, result)
}

func TestIsPrivateIP_LoopbackIPv4(t *testing.T) {
	// given
	ip := net.ParseIP("127.0.0.1")

	// when
	result := isPrivateIP(ip)

	// then
	assert.True(t, result)
}

func TestIsPrivateIP_LoopbackIPv6(t *testing.T) {
	// given
	ip := net.ParseIP("::1")

	// when
	result := isPrivateIP(ip)

	// then
	assert.True(t, result)
}

func TestIsPrivateIP_PrivateIPv4Ranges(t *testing.T) {
	// given
	tests := []struct {
		name string
		ip   string
	}{
		{name: "10.0.0.0/8 start", ip: "10.0.0.1"},
		{name: "10.0.0.0/8 middle", ip: "10.128.0.1"},
		{name: "10.0.0.0/8 end", ip: "10.255.255.254"},
		{name: "172.16.0.0/12 start", ip: "172.16.0.1"},
		{name: "172.16.0.0/12 middle", ip: "172.20.0.1"},
		{name: "172.16.0.0/12 end", ip: "172.31.255.254"},
		{name: "192.168.0.0/16 start", ip: "192.168.0.1"},
		{name: "192.168.0.0/16 middle", ip: "192.168.100.50"},
		{name: "192.168.0.0/16 end", ip: "192.168.255.254"},
		{name: "169.254.0.0/16 link-local", ip: "169.254.1.1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// when
			ip := net.ParseIP(tt.ip)
			result := isPrivateIP(ip)

			// then
			assert.True(t, result)
		})
	}
}

func TestIsPrivateIP_PrivateIPv6Ranges(t *testing.T) {
	// given
	tests := []struct {
		name string
		ip   string
	}{
		{name: "fc00::/7 unique local", ip: "fc00::1"},
		{name: "fd00::/8 unique local", ip: "fd00::1"},
		{name: "fe80::/10 link-local", ip: "fe80::1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// when
			ip := net.ParseIP(tt.ip)
			result := isPrivateIP(ip)

			// then
			assert.True(t, result)
		})
	}
}

func TestIsPrivateIP_PublicIPv4(t *testing.T) {
	// given
	tests := []struct {
		name string
		ip   string
	}{
		{name: "Google DNS", ip: "8.8.8.8"},
		{name: "Cloudflare DNS", ip: "1.1.1.1"},
		{name: "Public IP", ip: "93.184.216.34"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// when
			ip := net.ParseIP(tt.ip)
			result := isPrivateIP(ip)

			// then
			assert.False(t, result)
		})
	}
}

func TestIsPrivateIP_PublicIPv6(t *testing.T) {
	// given
	ip := net.ParseIP("2001:4860:4860::8888")

	// when
	result := isPrivateIP(ip)

	// then
	assert.False(t, result)
}

func TestIsPrivateIP_LinkLocalUnicast(t *testing.T) {
	// given
	ip := net.ParseIP("169.254.169.254")

	// when
	result := isPrivateIP(ip)

	// then
	assert.True(t, result)
}
