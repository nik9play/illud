const fontList = require('font-list')
const $ = require("jquery")
const _ = require("lodash")
const Sortable = require("sortablejs")
const { remote } = require("electron")
const fs = require('fs')
const chokidar = require("chokidar")
const path = require('path')
const i18next = require("i18next")
const LngDetector = require("i18next-electron-language-detector")
const Backend = require("i18next-sync-fs-backend")
const iconv = require("iconv-lite")
const AutoDetectDecoderStream = require('autodetect-decoder-stream')

//using different pathes on different os
if (process.platform == "win32") {
  var config_path = process.env.APPDATA + "/illud/config.json"
  var config_folder = process.env.APPDATA + "/illud/"
} else if (process.platform == "darwin" || process.platform == "linux") {
  var config_path = process.env.HOME + "/illud/config.json"
  var config_folder = process.env.HOME + "/illud/"
}

function loadSettings() {
  //checking exist of file
  if (!fs.existsSync(config_path)) {
    var options = {
      font: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace",
      font_ligatures: true,
      font_size: "14px"
    }

    fs.mkdir(config_folder, { recursive: true }, (err) => {
      if (err) throw err;
    })

    fs.writeFile(config_path, JSON.stringify(options), function(err) {
      if (err) throw err
      console.log("Config file not found, creating...");
    })
  }

  //applying settings
  fs.readFile(config_path, 'utf8', function (err,data) {
    if (err) throw err
    var data = JSON.parse(data)

    $("#editors").css({
      "font-family": data.font,
      "font-weightfont-variant-ligatures": data.font_ligatures,
      "font-size": data.font_size
    })
  });
}

var tab_list = []
var current_tab
var win = remote.getCurrentWindow()
//tab function
function tab(options) {
  var EditSession = ace.EditSession
  var session = new EditSession("")

  if (options == undefined) {
    options = {}
  }

  if (options.title == undefined) {
    options.title = "Untitled"
  }

  //define element
  var tab = $(`
  <div class="tab">
    <div class="title">${options.title}</div>
    <div class="close"></div>
  </div>
  `).appendTo(".tabs")

  var self = this
  
  //add tab to list
  tab_list.unshift(this)

  $(tab).children(".close").click(function() {
    self.close()
  })

  $(tab).children(".title").click(function() {
    self.active()
  })

  var watchdog

  var file
  var encoding

  //openFile function
  this.openFile = function() {
    remote.dialog.showOpenDialog({
      title: i18next.t("dialogs.openfile.title")
    }, function(filePaths) {
      /*fs.readFile(filePaths[0], 'utf-8', (err, data) => {
        if(err){
            alert("С файлом что-то не так:" + err.message);
            return
        }
        session.setValue(data)
        watchdog = chokidar.watch(filePaths[0]).on('change', (event, path) => {
          console.log(event, path);
        })
        $(tab).children(".title").html(path.basename(filePaths[0]))
      })*/
      file = filePaths[0]

      //detecting encoding and setValue
      var stream = fs.createReadStream(file).pipe(new AutoDetectDecoderStream({ defaultEncoding: 'utf-8' }))
      stream.on('data', function (data) {
        session.setValue(data)
        self.startWatch()
        $(tab).children(".title").html(path.basename(file))
        $(".encoding").html(stream._detectedEncoding)
        encoding = stream._detectedEncoding
        console.log("debug", encoding)
      }).on('end', function () {
        console.log('Done reading.')
      })
    })
  }

  //save function
  this.save = function() {
    if (watchdog) {
      //opened file \|
      watchdog.close()
      buffer = iconv.encode(session.getValue(), encoding);
      fs.writeFile(file, buffer, function (err) {
        if (err) {
          throw(err)
        }
        self.startWatch()
      })
      //new file \|
    } else {
      encoding = "utf-8"
      remote.dialog.showSaveDialog(win, { title: i18next.t("dialogs.save.title") + " " + options.title }, function(filename) {
        file = filename
        buffer = iconv.encode(session.getValue(), encoding);
        fs.writeFile(file, buffer, function (err) {
          if (err) {
            throw(err)
          }
          self.startWatch()
        })
        $(tab).children(".title").html(path.basename(file))
      })
    }
  }

  this.startWatch = function() {
    watchdog = chokidar.watch(file).on('change', (event, path) => {
      remote.dialog.showMessageBox(win, { type: "warning", title: "illud", message: i18next.t("dialogs.updatedfile.msg"), buttons: [i18next.t("dialogs.updatedfile.keepbtn"), i18next.t("dialogs.updatedfile.replacebtn")] }, function(response) {
        if (response == 0) {
          return false
        } else if (response == 1) {
          var stream = fs.createReadStream(file).pipe(new AutoDetectDecoderStream({ defaultEncoding: 'utf-8' }))
          stream.on('data', function (data) {
            session.setValue(data)
          }).on('end', function () {
            console.log('Done reading.')
          })
        }
      })
    })
  }

  this.close = function() {
    $(tab).remove()
    if ($(tab).hasClass("active")) {
      var current = _.indexOf(tab_list, self)
      if (tab_list[current + 1] != undefined) {
        tab_list[current + 1].active()
      } else if (tab_list[current - 1] != undefined) {
        tab_list[current - 1].active()
      } 
    }
    session = null
    if (watchdog) {
      watchdog.close()
    }
    _.remove(tab_list, function(n) {
      return n == self
    })
  }

  this.active = function() {
    $(".tab").removeClass("active")
    $(tab).addClass("active")
    main_editor.setSession(session)
    current_tab = self
  }

  this.active()
}

var sortable
function initEditor() {
  main_editor = ace.edit("editors", {
    mode: "ace/mode/text",
    selectionStyle: "text"
  })

  $(".tabs").dblclick(function() {
    new tab({title: "Unnamed"})
  })

  sortable = Sortable.create(document.getElementsByClassName('tabs')[0], {
    onEnd: function (evt) {
      console.log(evt)
      var evtreverse = (tab_list.length - 1)
      var newIndex = tab_list[evtreverse - evt.newIndex]
      var oldIndex = tab_list[evtreverse - evt.oldIndex]
      tab_list[evtreverse - evt.newIndex] = oldIndex
      tab_list[evtreverse - evt.oldIndex] = newIndex
    },
  })

  var StatusBar = ace.require("ace/ext/statusbar").StatusBar
  var statusbar = new StatusBar(main_editor, document.getElementsByClassName("status-bar")[0])
}

$(document).ready(function() {
  var main_editor
  //tabs scrolling
  $('.tabs').bind('mousewheel', function(e){
    if(e.originalEvent.wheelDelta < 0) {
      document.getElementsByClassName("tabs")[0].scrollBy(30,0)
    } else {
      document.getElementsByClassName("tabs")[0].scrollBy(-30,0)
    }

    return false;
  })
  fontList.getFonts()
  .then(fonts => {
    console.log(fonts)
  })
  .catch(err => {
    console.log(err)
  })

  i18next.use(LngDetector).use(Backend).init({
    fallbackLng: 'en',
    backend: {
      loadPath: path.join( remote.app.getAppPath(), '../lang/{{lng}}.json' ),
      addPath: path.join( remote.app.getAppPath(), '../lang/{{lng}}.json' ),
      jsonIndent: 2
    },
  },
  function(err, t) {})

  //menu

  var win = remote.getCurrentWindow()
  initEditor()
  loadSettings()
})
