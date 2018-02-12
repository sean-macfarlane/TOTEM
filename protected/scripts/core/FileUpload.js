class FileUpload {
    constructor() {
        this._initialize();
        this._selectedFileType = null;
    }

    _generateUniqueId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    _sizeConverter(bytes) {
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes == 0) return 'N/A';
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        if (i == 0) return bytes + ' ' + sizes[i];
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
    }

    _initialize() {
    	var fileTypeSelectorContainer = $('#fileTypeSelectorContainer');
    	var label = $('<p class="label">File type:</p>').appendTo(fileTypeSelectorContainer);
    	var buttonGroup = $('<div class="btn-group" data-toggle="buttons"></div>').appendTo(fileTypeSelectorContainer);
    	
  		var configButton = $('<label class="typeSelectorButton btn"></label>').appendTo(buttonGroup);
    	var configButtonInput = $('<input type="radio" name="options">Config</input>').appendTo(configButton);
  		configButton.click(function () {
  			this._selectedFileType = 'config';
  		}.bind(this))

  		var pcapButton = $('<label class="typeSelectorButton btn"></label>').appendTo(buttonGroup);
    	var pcapButtonInput = $('<input type="radio" name="options">Packet Capture</input>').appendTo(pcapButton);
  		pcapButton.click(function () {
  			this._selectedFileType = 'pcap';
  		}.bind(this));

  		$('#fileUploader').click(function (e) {
  			if (this._selectedFileType == null) {
  				e.preventDefault();
  				alert('Please select a file type.');
  			}
  		}.bind(this));

        $('#fileUploader').on('change', function () {
        	if (this._selectedFileType == null) {
  				e.preventDefault();
  				alert('Please select a file type.');
  			}

            var files = $('#fileUploader').get(0).files;

            if (files.length) {
                $('#noFilesSelected').remove();
            }

            for (var i = 0; i < files.length; ++i) {
                var file = files[i];

                var sourceUploadId = 'source-' + this._generateUniqueId();

                var currentTime = new Date();
                var uploadStartTimestamp = currentTime.getTime();
                var uploadStartTime = currentTime.toUTCString();

                var fileSize = this._sizeConverter(file.size);
                var listEntry = $('<span class="listEntry" id="' + sourceUploadId + '"></span>').appendTo($('<li></li>').appendTo('#fileUploadList'));
                $('<span>' + file.name + '</span>').appendTo(listEntry);
                $('<span>' + this._selectedFileType + '</span>').appendTo(listEntry);
                $('<span>' + fileSize + '</span>').appendTo(listEntry);
                $('<span>' + uploadStartTime + '</span>').appendTo(listEntry);
                $('<span><div class="loader spinner"></div></span>').appendTo(listEntry);

                var formData = new FormData();

                formData.append('file', file, file.name);
                formData.append('fileSize', fileSize);
                formData.append('fileType', this._selectedFileType);
                formData.append('timestamp', uploadStartTimestamp);

                TOTEM.reports.uploadFile(sourceUploadId, formData);
            }

            $('#fileUploader').val("");
        }.bind(this));

        $('#clearButton').on('click', function () {
            $('#fileUploadList').empty();
            $('<li id="noFilesSelected">No files selected..</li>').appendTo('#fileUploadList');
        });
    }
}