package main

import (
	"fmt"
	"time"
	"os"
	"os/exec"
)

func main(){
	d := time.Now()
	const layout = "2006/01/02"

	if len(os.Args) < 2 {
		fmt.Println("ERROR: 引数を指定してください。")
		os.Exit(1)
	}

	filename := os.Args[1]
	full_path := "/entry/" + d.Format(layout) + "/" + filename + ".md"
	// hugo new /entry/yyyy/mm/dd/xxx.md
	err := exec.Command("hugo", "new", full_path).Run()

	if err != nil {
		fmt.Println(err)
	}
}