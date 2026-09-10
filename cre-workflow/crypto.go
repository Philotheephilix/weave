// crypto.go — secp256k1 ECDH and ERC-5564 stealth address computation.
// No build tag: compiles for all targets including tests.
// main.go (wasip1 only) imports these via same package.

package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
)

// ERC5564Announcement mirrors an on-chain stealth address announcement.
type ERC5564Announcement struct {
	ID              string `json:"id"`
	EphemeralPubkey []byte `json:"ephemeralPubkey"`
	StealthAddress  string `json:"stealthAddress"`
}

// ── secp256k1 curve parameters ────────────────────────────────────────────────

var (
	secp256k1P, _  = new(big.Int).SetString("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F", 16)
	secp256k1N, _  = new(big.Int).SetString("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", 16)
	secp256k1Gx, _ = new(big.Int).SetString("79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", 16)
	secp256k1Gy, _ = new(big.Int).SetString("483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8", 16)
)

type ecPoint struct{ x, y *big.Int }

// infinity sentinel — ecPoint with nil fields represents the point at infinity.
func isInfinity(pt ecPoint) bool { return pt.x == nil }

func pointAdd(p1, p2 ecPoint) ecPoint {
	if isInfinity(p1) {
		return p2
	}
	if isInfinity(p2) {
		return p1
	}
	p := secp256k1P
	// P == Q: use doubling formula
	if p1.x.Cmp(p2.x) == 0 {
		if p1.y.Cmp(p2.y) == 0 {
			return pointDouble(p1)
		}
		// P == -Q: result is point at infinity
		return ecPoint{}
	}
	dx := new(big.Int).Sub(p2.x, p1.x)
	dy := new(big.Int).Sub(p2.y, p1.y)
	dx.Mod(dx, p)
	dy.Mod(dy, p)
	inv := new(big.Int).ModInverse(dx, p)
	if inv == nil {
		return ecPoint{} // should not happen after the checks above
	}
	lam := new(big.Int).Mul(dy, inv)
	lam.Mod(lam, p)
	x3 := new(big.Int).Mul(lam, lam)
	x3.Sub(x3, p1.x)
	x3.Sub(x3, p2.x)
	x3.Mod(x3, p)
	y3 := new(big.Int).Sub(p1.x, x3)
	y3.Mul(lam, y3)
	y3.Sub(y3, p1.y)
	y3.Mod(y3, p)
	return ecPoint{x3, y3}
}

func pointDouble(pt ecPoint) ecPoint {
	if isInfinity(pt) {
		return pt
	}
	p := secp256k1P
	x2 := new(big.Int).Mul(pt.x, pt.x)
	x2.Mod(x2, p)
	lam := new(big.Int).Mul(big.NewInt(3), x2)
	lam.Mod(lam, p)
	denom := new(big.Int).Mul(big.NewInt(2), pt.y)
	denom.Mod(denom, p)
	inv := new(big.Int).ModInverse(denom, p)
	if inv == nil {
		return ecPoint{}
	}
	lam.Mul(lam, inv)
	lam.Mod(lam, p)
	x3 := new(big.Int).Mul(lam, lam)
	x3.Sub(x3, pt.x)
	x3.Sub(x3, pt.x)
	x3.Mod(x3, p)
	y3 := new(big.Int).Sub(pt.x, x3)
	y3.Mul(lam, y3)
	y3.Sub(y3, pt.y)
	y3.Mod(y3, p)
	return ecPoint{x3, y3}
}

func scalarMul(k *big.Int, pt ecPoint) ecPoint {
	result := ecPoint{} // start at infinity
	if isInfinity(pt) {
		return result
	}
	addend := ecPoint{new(big.Int).Set(pt.x), new(big.Int).Set(pt.y)}
	for i := 0; i < k.BitLen(); i++ {
		if k.Bit(i) == 1 {
			result = pointAdd(result, addend)
		}
		addend = pointDouble(addend)
	}
	return result
}

// ecdhSecp256k1 returns the x-coordinate of scalar*point as 32 bytes.
func ecdhSecp256k1(scalar []byte, compressedPub []byte) ([]byte, error) {
	if len(compressedPub) != 33 {
		return nil, fmt.Errorf("invalid compressed pubkey length %d", len(compressedPub))
	}
	prefix := compressedPub[0]
	if prefix != 0x02 && prefix != 0x03 {
		return nil, fmt.Errorf("invalid pubkey prefix 0x%02x", prefix)
	}
	x := new(big.Int).SetBytes(compressedPub[1:])
	// y² = x³ + 7 mod p
	rhs := new(big.Int).Exp(x, big.NewInt(3), secp256k1P)
	rhs.Add(rhs, big.NewInt(7))
	rhs.Mod(rhs, secp256k1P)
	// y = rhs^((p+1)/4) mod p  (p ≡ 3 mod 4)
	exp := new(big.Int).Add(secp256k1P, big.NewInt(1))
	exp.Rsh(exp, 2)
	y := new(big.Int).Exp(rhs, exp, secp256k1P)
	if (y.Bit(0) == 0) != (prefix == 0x02) {
		y.Sub(secp256k1P, y)
	}
	k := new(big.Int).SetBytes(scalar)
	k.Mod(k, secp256k1N)
	if k.Sign() == 0 {
		return nil, fmt.Errorf("scalar is zero mod N")
	}
	shared := scalarMul(k, ecPoint{x, y})
	if shared.x == nil {
		return nil, fmt.Errorf("ECDH produced point at infinity")
	}
	result := make([]byte, 32)
	b := shared.x.Bytes()
	copy(result[32-len(b):], b)
	return result, nil
}

// computeStealthAddress returns the Ethereum address from an ERC-5564 shared secret.
// NOTE: uses sha256 as stand-in for keccak256 — consistent across TEE scanner and client.
// Replace with keccak256 before mainnet.
func computeStealthAddress(sharedSecret []byte) string {
	h := sha256.Sum256(sharedSecret)
	return "0x" + hex.EncodeToString(h[12:])
}

// scanAnnouncements checks ERC-5564 announcements against spendingKey.
func scanAnnouncements(spendingKey []byte, announcements []ERC5564Announcement) ([]string, error) {
	matches := make([]string, 0)
	for _, ann := range announcements {
		shared, err := ecdhSecp256k1(spendingKey, ann.EphemeralPubkey)
		if err != nil {
			continue // skip malformed entries
		}
		if stringsEqualFold(computeStealthAddress(shared), ann.StealthAddress) {
			matches = append(matches, ann.ID)
		}
	}
	return matches, nil
}

func stringsEqualFold(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := 0; i < len(a); i++ {
		ca, cb := a[i], b[i]
		if ca >= 'A' && ca <= 'Z' {
			ca += 32
		}
		if cb >= 'A' && cb <= 'Z' {
			cb += 32
		}
		if ca != cb {
			return false
		}
	}
	return true
}
