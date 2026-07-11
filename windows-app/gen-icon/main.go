// Generates icon.png (256x256, Eye of Horus mark) for the Windows app icon.
// Pure stdlib (image/png, image/draw) — no external asset pipeline needed.
// Run: go run ./gen-icon > ../icon.png
package main

import (
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"io"
	"math"
	"os"
)

const S = 256

func main() {
	img := image.NewRGBA(image.Rect(0, 0, S, S))

	bg := color.RGBA{0x13, 0x15, 0x19, 0xff}
	draw.Draw(img, img.Bounds(), &image.Uniform{bg}, image.Point{}, draw.Src)
	roundRect(img, 0, 0, S, S, 56, bg)

	white := color.RGBA{0xff, 0xff, 0xff, 0xff}
	cx, cy := float64(S)/2, float64(S)/2*0.92

	// Almond eye outline (two arcs meeting at corners), stroked.
	strokeAlmond(img, cx, cy, 96, 40, white, 10)

	// Iris.
	fillCircle(img, cx, cy, 24, white)
	fillCircle(img, cx, cy, 9, bg)

	// Lower "tear" mark (Eye of Horus flourish) + brow tick.
	fillTeardrop(img, cx-8, cy+58, 14, 46, white)
	fillDiagonal(img, cx+70, cy+56, cx+96, cy+92, 9, white)
	strokeBrow(img, cx-96, cy-30, cx+96, cy-46, white, 9)

	f, err := os.Create(os.Args[len(os.Args)-1])
	if err != nil {
		panic(err)
	}
	defer f.Close()
	if err := writePNG(f, img); err != nil {
		panic(err)
	}
}

func writePNG(w io.Writer, img image.Image) error {
	return png.Encode(w, img)
}

func roundRect(img *image.RGBA, x0, y0, x1, y1, r int, keep color.RGBA) {
	b := img.Bounds()
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			if inRoundRect(x, y, x0, y0, x1, y1, r) {
				continue
			}
			img.Set(x, y, color.RGBA{})
		}
	}
}

func inRoundRect(x, y, x0, y0, x1, y1, r int) bool {
	if x >= x0+r && x < x1-r {
		return y >= y0 && y < y1
	}
	if y >= y0+r && y < y1-r {
		return x >= x0 && x < x1
	}
	corners := [][2]int{{x0 + r, y0 + r}, {x1 - r, y0 + r}, {x0 + r, y1 - r}, {x1 - r, y1 - r}}
	for _, c := range corners {
		dx, dy := x-c[0], y-c[1]
		if dx*dx+dy*dy <= r*r {
			return true
		}
	}
	return false
}

func fillCircle(img *image.RGBA, cx, cy, r float64, col color.RGBA) {
	for y := int(cy - r - 1); y <= int(cy+r+1); y++ {
		for x := int(cx - r - 1); x <= int(cx+r+1); x++ {
			dx, dy := float64(x)-cx, float64(y)-cy
			if dx*dx+dy*dy <= r*r {
				img.Set(x, y, col)
			}
		}
	}
}

// strokeAlmond draws an almond/eye shape (two quadratic arcs) as an outline.
func strokeAlmond(img *image.RGBA, cx, cy, halfW, halfH float64, col color.RGBA, thick float64) {
	const steps = 400
	for i := 0; i <= steps; i++ {
		t := float64(i) / steps
		ang := t * math.Pi
		// top arc and bottom arc, both from -halfW..+halfW
		x := cx - halfW + 2*halfW*t
		yTop := cy - halfH*math.Sin(ang)
		yBot := cy + halfH*0.65*math.Sin(ang)
		dot(img, x, yTop, thick/2, col)
		dot(img, x, yBot, thick/2, col)
	}
}

func strokeBrow(img *image.RGBA, x0, y0, x1, y1 float64, col color.RGBA, thick float64) {
	const steps = 200
	for i := 0; i <= steps; i++ {
		t := float64(i) / steps
		x := x0 + (x1-x0)*t
		y := y0 + (y1-y0)*t + 30*math.Sin(t*math.Pi)*-0.3
		dot(img, x, y, thick/2, col)
	}
}

func fillDiagonal(img *image.RGBA, x0, y0, x1, y1, thick float64, col color.RGBA) {
	const steps = 100
	for i := 0; i <= steps; i++ {
		t := float64(i) / steps
		x := x0 + (x1-x0)*t
		y := y0 + (y1-y0)*t
		dot(img, x, y, thick/2, col)
	}
}

func fillTeardrop(img *image.RGBA, cx, cy, w, h float64, col color.RGBA) {
	const steps = 300
	for i := 0; i <= steps; i++ {
		t := float64(i) / steps
		y := cy + h*t
		width := w * (1 - t) * (0.3 + 0.7*(1-t))
		for dx := -width; dx <= width; dx += 1 {
			img.Set(int(cx+dx), int(y), col)
		}
	}
}

func dot(img *image.RGBA, cx, cy, r float64, col color.RGBA) {
	for y := int(cy - r); y <= int(cy+r); y++ {
		for x := int(cx - r); x <= int(cx+r); x++ {
			dx, dy := float64(x)-cx, float64(y)-cy
			if dx*dx+dy*dy <= r*r {
				img.Set(x, y, col)
			}
		}
	}
}
