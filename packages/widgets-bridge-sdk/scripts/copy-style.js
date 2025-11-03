const path = require("path")
const glob = require("glob")
const fse = require("fs-extra")

const tsconfig = require("../tsconfig.json")

const { outDir } = tsconfig.compilerOptions

const compileComps = () => {
    // const htmlEntriesPlugins = []
    glob.sync("./**/*.scss", {
        ignore: ["node_modules/**", "./dist/**", "build/**", "**/*.bak"],
    }).forEach((matchFilePath, idx) => {
        console.log('matchFilePath :>> ', matchFilePath)
        const targetDir = path.join(__dirname, "../", outDir, matchFilePath)
        console.log(targetDir)
        fse.copyFile(matchFilePath, targetDir, (err) => {
            if (err) console.log(err)
        })
    }, {})
}

compileComps()
