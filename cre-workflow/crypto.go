// No build tag: compiles for all targets including tests.
// main.go (wasip1 only) imports these via the same package.

package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
)

// ERC5564Announcement mirrors an on-chain stealth address announcement.
type ERC5564Announcement struct {
	ID              string `json:"id"`
	EphemeralPubkey []byte `json:"ephemeralPubkey"`
	StealthAddress  string `json:"stealthAddress"`
}

var (
	secp256k1P, _  = new(big.Int).SetString("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F", 16)
	secp256k1N, _  = new(big.Int).SetString("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", 16)
	secp256k1Gx, _ = new(big.Int).SetString("79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", 16)
	secp256k1Gy, _ = new(big.Int).SetString("483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8", 16)
)

type ecPoint struct{ x, y *big.Int }

// ecPoint with nil fields represents the point at infinity.
func isInfinity(pt ecPoint) bool { return pt.x == nil }

func pointAdd(p1, p2 ecPoint) ecPoint {
	if isInfinity(p1) {
		return p2
	}
	if isInfinity(p2) {
		return p1
	}
	p := secp256k1P
	if p1.x.Cmp(p2.x) == 0 {
		if p1.y.Cmp(p2.y) == 0 {
			return pointDouble(p1)
		}
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
	result := ecPoint{}
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

// deriveSpendPub returns the 33-byte compressed secp256k1 public key for a private scalar.
func deriveSpendPub(priv []byte) []byte {
	k := new(big.Int).SetBytes(priv)
	k.Mod(k, secp256k1N)
	pt := scalarMul(k, ecPoint{secp256k1Gx, secp256k1Gy})
	out := make([]byte, 33)
	if pt.y.Bit(0) == 0 {
		out[0] = 0x02
	} else {
		out[0] = 0x03
	}
	xb := pt.x.Bytes()
	copy(out[1+32-len(xb):], xb)
	return out
}

// computeStealthAddress returns the Ethereum address from an ERC-5564 shared secret
// and the recipient's spend public key (compressed 33-byte secp256k1).
//
// Derivation (mirrors stealth-address.ts checkStealthAddress):
//   h      = sha256(sharedX)                       — scalar
//   P      = spendPub + h·G                        — stealth pubkey (point addition)
//   addr   = sha256(uncompressed_P[1:])[12:]       — NOTE: sha256 not keccak256, consistent with TS
//
// Replace both sides with keccak256 before mainnet.
func computeStealthAddress(sharedX []byte, spendPub []byte) (string, error) {
	if len(spendPub) != 33 {
		return "", fmt.Errorf("spendPub must be 33 bytes, got %d", len(spendPub))
	}
	// h = sha256(sharedX) interpreted as a scalar
	hBytes := sha256.Sum256(sharedX)
	h := new(big.Int).SetBytes(hBytes[:])
	h.Mod(h, secp256k1N)

	// Decompress spendPub into an ecPoint
	prefix := spendPub[0]
	if prefix != 0x02 && prefix != 0x03 {
		return "", fmt.Errorf("invalid spendPub prefix 0x%02x", prefix)
	}
	sx := new(big.Int).SetBytes(spendPub[1:])
	rhs := new(big.Int).Exp(sx, big.NewInt(3), secp256k1P)
	rhs.Add(rhs, big.NewInt(7))
	rhs.Mod(rhs, secp256k1P)
	exp := new(big.Int).Add(secp256k1P, big.NewInt(1))
	exp.Rsh(exp, 2)
	sy := new(big.Int).Exp(rhs, exp, secp256k1P)
	if (sy.Bit(0) == 0) != (prefix == 0x02) {
		sy.Sub(secp256k1P, sy)
	}
	spendPoint := ecPoint{sx, sy}

	// h·G
	G := ecPoint{secp256k1Gx, secp256k1Gy}
	hG := scalarMul(h, G)

	// P = spendPoint + h·G
	stealthPoint := pointAdd(spendPoint, hG)
	if isInfinity(stealthPoint) {
		return "", fmt.Errorf("stealth point is at infinity")
	}

	// Serialize uncompressed (04 || x || y), then sha256(x||y)[12:]
	uncompressed := make([]byte, 65)
	uncompressed[0] = 0x04
	xb := stealthPoint.x.Bytes()
	copy(uncompressed[1+32-len(xb):33], xb)
	yb := stealthPoint.y.Bytes()
	copy(uncompressed[33+32-len(yb):], yb)
	// hash the 64-byte payload after the 04 prefix, matching TS: sha256(uncompressed.slice(1))
	addrHash := sha256.Sum256(uncompressed[1:])
	return "0x" + hex.EncodeToString(addrHash[12:]), nil
}

// scanAnnouncements checks ERC-5564 announcements using the ERC-5564 view key for ECDH
// and the spend public key for stealth address derivation.
func scanAnnouncements(viewKey []byte, spendPub []byte, announcements []ERC5564Announcement) ([]string, error) {
	matches := make([]string, 0)
	for _, ann := range announcements {
		// ECDH uses the VIEW key, not the spend key
		shared, err := ecdhSecp256k1(viewKey, ann.EphemeralPubkey)
		if err != nil {
			continue // skip malformed entries
		}
		candidate, err := computeStealthAddress(shared, spendPub)
		if err != nil {
			continue
		}
		// Compare case-insensitively, stripping 0x prefix
		candidateHex := strings.TrimPrefix(strings.ToLower(candidate), "0x")
		announcedHex := strings.TrimPrefix(strings.ToLower(ann.StealthAddress), "0x")
		if candidateHex == announcedHex {
			matches = append(matches, ann.ID)
		}
	}
	return matches, nil
}
