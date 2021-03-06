(function () {
  var chunk = 272144, file, output = document.querySelector('#output'), fileReader = new FileReader();

  var fileChosen = function(evnt) {
    file = evnt.target.files[0];
  };

  var currentChunk = 0;
  fileReader.onload = function(evnt) {
    var formData = new FormData();
    formData.append('name', file.name);
    formData.append('data', evnt.target.result);
    formData.append('chunk', currentChunk+"");
    sendData(formData);
  };

  var startUpload = function() {
    var formData = new FormData();
    console.log("Sending: " + file.name + "(" + file.size + ")");
    formData.append('name', file.name);
    formData.append('size', file.size);
    sendData(formData);
  };

  var sendUrl = function() {
    var url = "";
    var username = "";
    var password = "";
    var urlInput = document.querySelector('#url');
    var usernameInput = document.querySelector('#username');
    var passwordInput = document.querySelector('#password');
    if (urlInput !== null) url = urlInput.value;
    if (usernameInput !== null) username = usernameInput.value;
    if (passwordInput !== null) password = passwordInput.value;
    if (url === "") return;
    postUrl(url, username, password);
    urlInput.value = "";
  }

  var postUrl = function(url, username, password) {
    var formData = new FormData();
    console.log("Sending URL: " + url);
    formData.append('url', url);
    formData.append('username', username);
    formData.append('password', password);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/loadfromurl', true);
    xhr.onload = function(e) {
      if (this.status == 200) {
        if (this.response === "download started") {
          progress(3);
        } else if (this.response === "already uploaded") {
          progress(2);
        } else if (this.response === "invalid uri") {
          progress(4);
        }
        console.log(this.response);
      }
    };
    xhr.send(formData);
  };

  var sendChunk = function(offset) {
    //console.log('sending chunk ', offset);
    var place = offset * chunk; //The Next Blocks Starting Position
    var blob = new Blob([file], {"type" : file.type});
    var nFile = blob.slice(place, place + Math.min(chunk, (file.size-place)));
    //console.log(file.type + " - " +nFile);
    currentChunk = offset;
    fileReader.readAsDataURL(nFile);
  };

  var sendData = function(formData) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload', true);
    xhr.onload = function(e) {
      if (this.status == 200) {
        var part;
        if (this.response.slice(0,5) === 'chunk') {
          part = parseInt(this.response.slice(5), 10);
          sendChunk(part);

          var chunksTot = ~~(file.size / 272144);
          var p = part/chunksTot;
          progress(p);
        } else if (this.response === "upload complete") {
          progress(1);
        } else if (this.response === "already uploaded") {
          progress(2);
        }
        console.log(this.response);
      }
    };
    xhr.send(formData);
  };

  var progress = function(p) {
    var bar = document.querySelector('.progress-bar');
    if (p == 1) {
      bar.className = 'progress-bar progress-bar-success progress-bar-striped  active';
      bar.innerHTML = 'Done!';
      bar.style.width = '100%';
    } else if (p == 2) {
      bar.className = 'progress-bar progress-bar-warning progress-bar-striped  active';
      bar.innerHTML = 'Already uploaded!';
      bar.style.width = '100%';
    } else if (p == 3) {
      bar.className = 'progress-bar progress-bar-success progress-bar-striped  active';
      bar.innerHTML = 'Download started!';
      bar.style.width = '100%';
    } else if (p == 4) {
      bar.className = 'progress-bar progress-bar-danger progress-bar-striped  active';
      bar.innerHTML = 'Invalid URL!';
      bar.style.width = '100%';
    } else {
      bar.className = 'progress-bar progress-bar-striped  active';
      bar.style.width = p*100 + '%';
      bar.innerHTML = ~~(p*100) + '%';
    }
  };

  if (window.File && window.FileReader){
    document.querySelector('#submit').addEventListener('click', startUpload);
  } else {
    document.querySelector('#message').innerHTML = "<strong>Your browser doesn't support the File API. Please update your browser!</strong>";
    document.querySelector('#message').className = 'alert alert-danger';
  }
  document.querySelector('#sendurl').addEventListener('click', sendUrl);

  // D&D
  function handleFileSelect(event) {
    if (event != null) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (event.type === 'change') {
      file = this.files[0];
    } else if (event.type === 'drop') {
      if (event.dataTransfer) {
        file = event.dataTransfer.files[0];
      } else {
        file = event.originalEvent.dataTransfer.files[0];
      }
    }
    if (file === undefined) {
      console.log("No file to select.");
      return;
    }
    console.log("File opened:", file.name, file.type, file.size);
    document.getElementById('dropareafile').innerHTML = file.name;
  }

  function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

  // Setup the dnd listeners.
  var dropZone = document.getElementById('drop_zone');
  dropZone.addEventListener('dragover', handleDragOver, false);
  dropZone.addEventListener('drop', handleFileSelect, false);

  var dropZoneFile = document.getElementById('fileinput');
  dropZoneFile.addEventListener('change', handleFileSelect, false);

}());
