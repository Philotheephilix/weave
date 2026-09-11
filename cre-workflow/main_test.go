//go:build !wasip1

package main

import (
	"encoding/hex"
	"math/big"
	"strings"
	"testing"
)

// ── ECDH tests ────────────────────────────────────────────────────────────────

func TestECDH_InvalidLength(t *testing.T) {
	scalar := make([]byte, 32)
	scalar[31] = 1
	_, err := ecdhSecp256k1(scalar, []byte{0x02, 0x01})
	if err == nil {
		t.Fatal("expected error for invalid pubkey length")
	}
}

func TestECDH_InvalidPrefix(t *testing.T) {
	scalar := make([]byte, 32)
	scalar[31] = 1
	pub := make([]byte, 33)
	pub[0] = 0x04 // uncompressed prefix — invalid for this function
	_, err := ecdhSecp256k1(scalar, pub)
	if err == nil {
		t.Fatal("expected error for invalid prefix")
	}
}

func TestECDH_Commutative(t *testing.T) {
	// a = 2, b = 3
	a := make([]byte, 32)
	a[31] = 2
	b := make([]byte, 32)
	b[31] = 3

	// aG and bG
	aG := scalarMulToCompressed(2)
	bG := scalarMulToCompressed(3)

	sharedAB, err := ecdhSecp256k1(a, bG)
	if err != nil {
		t.Fatalf("ECDH(a, bG): %v", err)
	}
	sharedBA, err := ecdhSecp256k1(b, aG)
	if err != nil {
		t.Fatalf("ECDH(b, aG): %v", err)
	}

	if hex.EncodeToString(sharedAB) != hex.EncodeToString(sharedBA) {
		t.Errorf("ECDH not commutative:\n  AB=%x\n  BA=%x", sharedAB, sharedBA)
	}
}

// scalarMulToCompressed computes k*G and returns compressed form (33 bytes)
func scalarMulToCompressed(k int64) []byte {
	g := ecPoint{x: new(big.Int).Set(secp256k1Gx), y: new(big.Int).Set(secp256k1Gy)}
	pt := scalarMul(big.NewInt(k), g)
	result := make([]byte, 33)
	if pt.y.Bit(0) == 0 {
		result[0] = 0x02
	} else {
		result[0] = 0x03
	}
	xBytes := pt.x.Bytes()
	copy(result[1+32-len(xBytes):], xBytes)
	return result
}

// ── Stealth address tests ─────────────────────────────────────────────────────

func TestComputeStealthAddress_Length(t *testing.T) {
	secret := make([]byte, 32)
	secret[0] = 0xde
	addr := computeStealthAddress(secret)
	// must be 0x + 40 hex chars
	if len(addr) != 42 {
		t.Errorf("expected 42 chars, got %d: %s", len(addr), addr)
	}
	if addr[:2] != "0x" {
		t.Errorf("expected 0x prefix")
	}
}

// ── Scan tests ────────────────────────────────────────────────────────────────

func TestScanAnnouncements_Empty(t *testing.T) {
	scalar := make([]byte, 32)
	scalar[31] = 1
	matches, err := scanAnnouncements(scalar, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(matches) != 0 {
		t.Errorf("expected 0 matches, got %d", len(matches))
	}
}

func TestScanAnnouncements_Match(t *testing.T) {
	// spending key scalar = 3
	spendKey := make([]byte, 32)
	spendKey[31] = 3

	// ephemeral key scalar = 2 → ephemeral pubkey = 2*G
	ephPub := scalarMulToCompressed(2)

	// compute expected stealth address: ECDH(3, 2G) = 6G → keccak(x)
	shared, err := ecdhSecp256k1(spendKey, ephPub)
	if err != nil {
		t.Fatalf("setup ECDH: %v", err)
	}
	expected := computeStealthAddress(shared)

	anns := []ERC5564Announcement{
		{ID: "ann-001", EphemeralPubkey: ephPub, StealthAddress: expected},
	}
	matches, err := scanAnnouncements(spendKey, anns)
	if err != nil {
		t.Fatalf("scanAnnouncements: %v", err)
	}
	if len(matches) != 1 || matches[0] != "ann-001" {
		t.Errorf("expected [ann-001], got %v", matches)
	}
}

func TestScanAnnouncements_NoMatch(t *testing.T) {
	spendKey := make([]byte, 32)
	spendKey[31] = 3

	ephPub := scalarMulToCompressed(2)
	anns := []ERC5564Announcement{
		{ID: "ann-999", EphemeralPubkey: ephPub, StealthAddress: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"},
	}
	matches, err := scanAnnouncements(spendKey, anns)
	if err != nil {
		t.Fatalf("scanAnnouncements: %v", err)
	}
	if len(matches) != 0 {
		t.Errorf("expected 0 matches, got %v", matches)
	}
}

func TestScanAnnouncements_MalformedPubkeySkipped(t *testing.T) {
	spendKey := make([]byte, 32)
	spendKey[31] = 1
	anns := []ERC5564Announcement{
		{ID: "bad", EphemeralPubkey: []byte{0x00}, StealthAddress: "0x1234"},
	}
	// must not error — malformed entries are skipped
	matches, err := scanAnnouncements(spendKey, anns)
	if err != nil {
		t.Fatalf("expected no error for malformed entry, got: %v", err)
	}
	if len(matches) != 0 {
		t.Errorf("expected 0 matches for malformed entry")
	}
}

func TestEqualFold(t *testing.T) {
	cases := []struct {
		a, b string
		want bool
	}{
		{"0xAbCd", "0xabcd", true},
		{"0xABCD", "0xABCD", true},
		{"0xABCD", "0xabce", false},
		{"0xABCD", "0xABC", false},
	}
	for _, c := range cases {
		got := strings.EqualFold(c.a, c.b)
		if got != c.want {
			t.Errorf("strings.EqualFold(%q, %q) = %v, want %v", c.a, c.b, got, c.want)
		}
	}
}
