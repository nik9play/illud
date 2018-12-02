const { app, BrowserWindow, Menu, dialog } = require("electron")
const i18next = require("i18next")
const LngDetector = require("i18next-electron-language-detector")
const Backend = require("i18next-sync-fs-backend")
const path = require("path")

let win

function createWindow () {
  win = new BrowserWindow({ width: 800, height: 600, minWidth: 320, minHeight: 180 })
  let contents = win.webContents
  win.once("ready-to-show", () => {
    win.show()
  })
  win.loadFile("index.html")

  win.on("closed", () => {
    win = null
  })

  i18next.use(LngDetector).use(Backend).init({
    fallbackLng: "en",
    backend: {
      loadPath: path.join( app.getAppPath(), "../lang/{{lng}}.json" ),
      addPath: path.join( app.getAppPath(), "../lang/{{lng}}.json" ),
      jsonIndent: 2
    },
  },
  function() {
    var template = [{
      label: "Application",
      submenu: [
        { label: i18next.t("menu.main.about"), click: function() {
          dialog.showMessageBox(win, {type: "info", title: "illud", message: "illud", buttons: ["OK"], detail: `${i18next.t("menu.main.version")}: ${app.getVersion()}\nmegaworld network`})
        } },
        { type: "separator" },
        { label: i18next.t("menu.main.quit"), accelerator: "Command+Q", click: function() { app.quit() }},
        { label: "Open WebTools", click: function() { contents.openDevTools() }}
      ]},
    {
      label: i18next.t("menu.file.file"),
      submenu: [
        { label: i18next.t("menu.file.newfile"), accelerator: "CmdOrCtrl+N", click: function() { contents.executeJavaScript("new tab()", true) } },
        { type: "separator" },
        { label: i18next.t("menu.file.openfile"), accelerator: "CmdOrCtrl+O", click: function() { contents.executeJavaScript("current_tab.openFile()", true) } },
        { type: "separator" },
        { label: i18next.t("menu.file.save"), accelerator: "CmdOrCtrl+S", click: function() { contents.executeJavaScript("current_tab.save()", true) } },
        { label: i18next.t("menu.file.saveas"), accelerator: "Shift+CmdOrCtrl+S", click: function() { contents.executeJavaScript("current_tab.saveAs()", true) } },
        { type: "separator" },
        { label: i18next.t("menu.file.closetab"), accelerator: "CmdOrCtrl+W", click: function() { contents.executeJavaScript("current_tab.close()", true) } }
      ]},
    {
      label: i18next.translator.translate("menu.edit.edit"),
      submenu: [
        { label: i18next.t("menu.edit.undo"), accelerator: "CmdOrCtrl+Z", selector: "undo:" },
        { label: i18next.t("menu.edit.redo"), accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
        { type: "separator" },
        { label: i18next.t("menu.edit.find"), accelerator: "CmdOrCtrl+F", selector: "find:" },
        { label: i18next.t("menu.edit.replace"), accelerator: "CmdOrCtrl+Option+F", selector: "replace:" },
        { type: "separator" },
        { label: i18next.t("menu.edit.cut"), accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: i18next.t("menu.edit.copy"), accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: i18next.t("menu.edit.paste"), accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: i18next.t("menu.edit.selectall"), accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
      ]}
    ]
  
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  })
}

app.on("ready", createWindow)

// macos shit
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (win === null) {
    createWindow()
  }
})