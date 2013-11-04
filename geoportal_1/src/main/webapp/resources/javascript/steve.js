
// uses Thomas Lahoda's shape file parsing and rendering library
// it is on GitHub

function layerTest()
{
    var map = org.OpenGeoPortal.map;
    var lineLayer = new OpenLayers.Layer.Vector("Line Layer"); 

    map.addLayer(lineLayer);                    
    map.addControl(new OpenLayers.Control.DrawFeature(lineLayer, OpenLayers.Handler.Path));       
    var points 
	= new Array(
		    new OpenLayers.Geometry.Point(20., 20.).transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject()),
		    new OpenLayers.Geometry.Point(0., 0.).transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject()));

    var line = new OpenLayers.Geometry.LineString(points);

    var style = { 
	strokeColor: '#0000ff', 
	strokeOpacity: 0.5,
	strokeWidth: 2
    };

    var lineFeature = new OpenLayers.Feature.Vector(line, null, style);
    lineLayer.addFeatures([lineFeature]);

    var highlightControl = new OpenLayers.Control.SelectFeature(lineLayer, {
	    hover: true,
	    highlightOnly: true,
	    renderIntent: "temporary",
	    eventListeners: {
		beforefeaturehighlighted: report,
		featurehighlighted: report,
		featureunhighlighted: report
	    }
	});
    map.addControl(highlightControl);
    highlightControl.activate();
};

function report(e)
{
    foo = e;
    console.log(e.feature.dbfId);
    console.log(shapeFile.dbfRecords[e.feature.dbfId]);
    
};

function updateDbf(e)
{
    console.log("updateDbf with dbfDivName " + dbfDivName);
    //if (dbfDivName == null)
    //return;
    //tempDiv = document.getElementById(dbfDivName);
    featureId = e.feature.dbfId;
    dbfRecord = shapeFile.dbfRecords[e.feature.dbfId];
    var attributeHtml = "<table class='attributeInfo'>";
    for (i = 0 ; i < shapeFile.dbfFieldInfo.length ; i++)
    {
	var currentFieldName = shapeFile.dbfFieldInfo[i].name;
	var currentFieldValue = dbfRecord[currentFieldName];
	attributeHtml += "<tr><td class='atributeName'>" + currentFieldName + "</td>";
	attributeHtml += "<td>" + currentFieldValue + "</td></tr>";;
    }
    attributeHtml += "</table>";
    displayAttributeDiv("Feature Attributes", attributeHtml);
    //tempDiv.innerHTML = attributeHtml;
    //tempDiv.innerHTML = "PROV_34_NA: " + dbfRecord["PROV_34_NA"];
};

function displayAttributeDiv(dialogTitle, tableText)
{
    if (typeof jQuery('#featureInfo')[0] == 'undefined')
    {
	var infoDiv = '<div id="featureInfo" class="dialog">' + dialogTitle + tableText + '</div\>';
	jQuery("body").append(infoDiv);
	jQuery("#featureInfo").dialog({
		zIndex: 2999,
		    title: "FEATURE ATTRIBUTES",
		    width: 'auto',
		    height: 'auto',
		    autoOpen: false
		    });       
	jQuery("#featureInfo").dialog('open');
    } 
    else 
    {
	jQuery("#featureInfo").html(dialogTitle + tableText);
	//jQuery("#featureInfo").dialog("option", "height", dataHeight);
	jQuery("#featureInfo").dialog('open');
    }
};

dbfDivName = null;

function setDbfDiv(divName)
{
    console.log("setting dbf div to " + divName);
    dbfDivName = divName;
}

function shapeLoad(shapeFileName)
{
    //var shapeFileName = "resources/javascript/external/shapefiles/northamerica_adm0";
    //var shapeFileName = "resources/javascript/external/shapefiles/GISPORTAL_GISOWNER01_SOMERVILLESTREETS02";
    //var shapeFileName = "resources/javascript/external/shapefiles/GISPORTAL_GISOWNER01_SOMERVILLECITYBOUNDARY05";
    //var shapeFileName = "resources/javascript/external/shapefiles/hydrobasins_southam";
    //var shapeFileName = "resources/javascript/external/shapefiles/rw-woody-agg";
    //var shapeFileName = "resources/tmp/RWA_Airports_NISR";
    if (shapeFileName == null)
	shapeFileName = "resources/tmp/chd_adm2_arc_ocha";
    console.log("in shapeLoad, loading " + shapeFileName);
    shapeFile = new ShapeFile (shapeFileName);
    dbfInfo = readDbfFile(shapeFileName, shapeFile);
    return shapeFile;
};

var limitDraw = true;
var limitDrawCount = 100000;

function createLayer()
{
    var styleMap = new OpenLayers.StyleMap({
	    fillColor: "#FF5500",
	    fillOpacity: .5,
	    pointRadius: 5,
	    strokeColor: '#0000ff', 
	    strokeOpacity: 1.0,
	    strokeWidth: 2
	    });


    strategy = new OpenLayers.Strategy.Cluster({distance: 150, threshold: 3});
    layer = new OpenLayers.Layer.Vector("Airports", {strategies: [strategy], 
						     //renderers: ["SVG", "VML"], styleMap: styleMap});
						     renderers: ["Canvas", "SVG", "VML"], styleMap: styleMap});
    console.log("added strategy");
    //    var cluster = new OpenLayers.Strategy.Cluster({distance: 550, threshold: 15});  // new OpenLayers.Strategy.Fixed(),
    //   var layer = new OpenLayers.Layer.Vector("shapeLayer", {//styleMap: styleMap,
    //						   strategies: [cluster]});
    return layer;
}
function shapeDraw(passedUrl)
{
    console.log("Drawing last loaded shape, number of shapes = " + shapeFile.shapes.length);
    console.time("draw");
    var map = org.OpenGeoPortal.map;
    var layer = createLayer();
    // create layer and pass are argument to rendering functions
    // layers might be named shapeLayernn

    for (var k = 0 ; k < shapeFile.shapes.length ; k++)
	{
	    var currentShape = shapeFile.shapes[k];
	    shapeDrawAux(map, layer, currentShape, k);
	    if ((k > limitDrawCount) && limitDraw)
		{
		    console.timeEnd("draw");
		    layer.addFeatures(savedPoints);
		    map.addLayer(layer);
		    return;
		}

	    console.timeEnd("draw");
	}
    console.log("number of points = " + savedPoints.length);
    layer.addFeatures(savedPoints);

    var highlightControl = new OpenLayers.Control.SelectFeature(layer, {
	    hover: true,
	    highlightOnly: true,
	    renderIntent: "temporary",
	    eventListeners: {
		beforefeaturehighlighted: report,
		featurehighlighted: updateDbf,
		featureunhighlighted: report
	    }
	});
    map.addLayer(layer);
    map.addControl(highlightControl);
    highlightControl.activate();

    urlToLayerHash[passedUrl] = layer;
    urlToControlHash[passedUrl] = highlightControl;
    return layer;


};

// call the right drawing function based on shape
// from Lahoda's render function
function shapeDrawAux(map, layer, shape, id)
{
  switch (shape.header[0]) {
    case 0:
      //NullShape does not need rendering. 
      break;
    case 1: //Point
    case 11: //PointZ
    case 21: //PointM
	addPoint (map, layer, shape, id);
      break;
    case 8: //MultiPoint
    case 18: //MultiPointZ
    case 28: //MultiPointM
	drawMultiPoint (map, layer, shape, id);
      break;
    case 5: //Polygon
    case 15: //PolygonZ
    case 25: //PolygonM
    case 3: //PolyLine
    case 13: //PolyLineZ
    case 23: //PolyLineM
	drawPolygon (map, layer, shape, id);
      break;
      //    case 31: //MultiPatch
      //      renderMultiPatch.apply (shape, context);
      //      break;
    default:
      throw "Shape type unknown: " + shape.header[0] + ".";
  }
};

function drawPoint(map, layer, shape, id)
{
    var coord = shape.coords;
    var points = new Array();
    var point = new OpenLayers.Geometry.Point(coord[0], coord[1]).transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject());

    var feature = new OpenLayers.Feature.Vector(point, {x: point.x, y: point.y}); //, null, style);

    layer.addFeatures([feature]);
};

var savedPoints = [];
function addPoint(map, layer, shape)
{
    var coord = shape.coords;
    var points = new Array();
    var point = new OpenLayers.Geometry.Point(coord[0], coord[1]).transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject());

    var feature = new OpenLayers.Feature.Vector(point, {x: point.x, y: point.y}); //, null, style);
    savedPoints.push(feature);
    //layer.addFeatures([feature]);
};

// draw shape object representing a polygon in a new OpenLayers layer
function drawPolygon(map, layer, shape, id)
{
    for (var j = 0 ; j < shape.parts.length ; j++)
	{

	    //map.addControl(new OpenLayers.Control.DrawFeature(lineLayer, OpenLayers.Handler.Path));       
	    var points 	= new Array();
	    for (var i=0 ; i < shape.parts[j].length - 1 ; i++)
		{
		    var currentPoint = shape.parts[j][i];
		    if ((currentPoint[0] != NaN) && (currentPoint[1] != NaN))
			{
			    var currentOpenLayersPoint = 
				new OpenLayers.Geometry.Point(currentPoint[1], currentPoint[0]).transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject());
			    points.push(currentOpenLayersPoint);
			}
		}
	    // close the loop
	    var currentPoint = shape.parts[j][0];
	    var line = new OpenLayers.Geometry.LineString(points);
	    if ((currentPoint[0] != NaN) && (currentPoint[1] != NaN))
	    {
		var currentOpenLayersPoint = 
		    new OpenLayers.Geometry.Point(currentPoint[1], currentPoint[0]).transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject());
		points.push(currentOpenLayersPoint);
	    }
	    
	    var style = { 
		strokeColor: '#0000ff', 
		strokeOpacity: 1.0,
		strokeWidth: 2
	    };

	    var lineFeature = new OpenLayers.Feature.Vector(line, null, style);
	    lineFeature.dbfId = id;
	    layer.addFeatures([lineFeature]);
	    if (limitDraw && (j > limitDrawCount))
		{
		    console.log("limiting draw");
		    j = shape.parts.length;
		}
	}
};

function loadAndRenderShape(passedUrl)
{
    console.log("in loadAndRenderShape with " + passedUrl);
    if (passedUrl == null)
	passedUrl = ["http://cod.humanitarianresponse.info/sites/default/files/npl_airdrmp_airp_withstatus_ocha_wgs84.zip"];
    //passedUrl = ["http://cod.humanitarianresponse.info/sites/default/files/np-roads1996.zip"];  //nepal roads
	// passedUrl = ["http://www.fao.org/geonetwork/srv/en/resources.get?id=30532&fname=af_cru_mask.zip&access=private"];
	//  passedUrl = ["http://cod.humanitarianresponse.info/sites/default/files/sous_prefecture.zip"];
    //	passedUrl = ["http://cod.humanitarianresponse.info/sites/default/files/chd_adm2_ply_ocha.zip"];

    console.time("cache");
    shapeFileUrl = passedUrl[0];
    console.log("in loadAndRenderShape shapeFileUrl = " + shapeFileUrl); 
    requestUrl =  "cacheShapeFile.jsp?url=" + encodeURIComponent(shapeFileUrl);
    var ajaxParams = {type: "GET", url: requestUrl, dataType: "json",
		      success: function(data) {console.log("in success with " + data); param = arg; loadAndRenderShapeAux(arg, passedUrl)},
		      error: function(arg) {console.log("in error with " + arg); param = arg; loadAndRenderShapeAux(arg, passedUrl);}};
    jQuery.ajax(ajaxParams);

};


// needed to erase layer
var urlToLayerHash = {};
var urlToControlHash = {};

function eraseShape(url)
{
    var map = org.OpenGeoPortal.map;
    var layer = urlToLayerHash[url];
    if (layer != null)
    {

	map.removeLayer(layer);
    }
    var control = urlToControlHash[url];
    if (control != null)
    {
	control.deactivate();
	map.removeControl(control);
    }
}

function loadAndRenderShapeAux(arg, passedUrl)
{
    console.timeEnd("cache");
    console.log("passed to loadAndRenderShapeAux  = " + arg);
    foo = arg;
    shapeFilePath = arg.responseText;
    console.time("load");
    shapeLoad(shapeFilePath);
    console.timeEnd("load");
    var layer = shapeDraw(passedUrl);

};



function fixedLength(passedArray)
{
    var count = 0;
    for (var i in passedArray)
	{
	    var current = passedArray[i];
	    if (typeof(current) != "function")
		count++;
	}
    return count;
};


// consider putting an array of field description hashes on the shape object
// we might need some char look ahead to detect the end of the field descriptions
function readDbfFile(resourceName, shapeFile)
{
    shapeFile.dbfFieldInfo = [];
    dataView = new jDataViewReader(new jDataView(load_binary_resource(resourceName + ".dbf")));
    readDbfFileHeader(dataView);
    readDbfFieldDescriptions(dataView);
    /*
    shapeFile.dbfFieldInfo.push(readDbfFieldDescription(dataView));
    shapeFile.dbfFieldInfo.push(readDbfFieldDescription(dataView));
    shapeFile.dbfFieldInfo.push(readDbfFieldDescription(dataView));
    shapeFile.dbfFieldInfo.push(readDbfFieldDescription(dataView));
    shapeFile.dbfFieldInfo.push(readDbfFieldDescription(dataView));
    shapeFile.dbfFieldInfo.push(readDbfFieldDescription(dataView));
    shapeFile.dbfFieldInfo.push(readDbfFieldDescription(dataView));
    shapeFile.dbfFieldInfo.push(readDbfFieldDescription(dataView));
    shapeFile.dbfFieldInfo.push(readDbfFieldDescription(dataView));
    shapeFile.dbfFieldInfo.push(readDbfFieldDescription(dataView));
    shapeFile.dbfFieldInfo.push(readDbfFieldDescription(dataView));
    shapeFile.dbfFieldInfo.push(readDbfFieldDescription(dataView));
    shapeFile.dbfFieldInfo.push(readDbfFieldDescription(dataView));
    */
    shapeFile.dbfRecords = []
    readDbfRecords(dataView, shapeFile);
};


// the dbf reading code is in part based on 
// https://github.com/wavded/js-shapefile-to-geojson/blob/master/dbf.js
// but uses the same binary stream process that is used by the shp and shx code
function readDbfFileHeader(dataView)
{
    // first 4 bytes are dbf version, year ,month, date (3, 111, 8, 17)
    int1 = dataView.readInt32(true);
    day = int1 & 0xff;
    month = (int1 >> 8) & 0xff;
    year  = (int1 >> 16) & 0xff;
    dbfVersion = (int1 >> 24) & 0xff;
    console.log(dbfVersion + " " + year + " " + month + " " + day);

    numberOfRecords = dataView.readInt32(true);
    console.log(numberOfRecords);
    
    int3 = dataView.readInt32(true);
    recordLength = (int3 >> 16) & 0xFFFF;
    firstRecordPosition = int3 & 0xFFFF;
    console.log(firstRecordPosition + " " + recordLength);

    // skip 16 bytes
    dataView.readInt32(true);
    dataView.readInt32(true);
    dataView.readInt32(true);
    dataView.readInt32(true);

    nextInt = dataView.readInt32(true);
    flags = (nextInt >> 24) & 0xFF;
    codePageMark = (nextInt >> 16) & 0xFF;
};

function readDbfFieldDescriptions(dataView)
{
    while (anotherDbfFieldDescription(dataView))
	shapeFile.dbfFieldInfo.push(readDbfFieldDescription(dataView));
};

// is the next thing in the item to read a field description
// peek at next buyte to determine
function anotherDbfFieldDescription(dataView)
{
    var nextByte = dataView.readInt8();
    dataView.seek(dataView.pos - 1);  // put peeked character back
    if (nextByte == 0x0D)
	return false;
    else
    {
	return true;
    }
};

function readDbfFieldDescription(dataView)
{
    // sample data: CLASSES F 0 19 11 0 0
    name = readDbfString(dataView, 11);
    type = readDbfString(dataView, 1);
    displacement = dataView.readInt32(true);
    fieldLength = dataView.readInt8(); // in bytes
    decimalPlaces = dataView.readInt8();
    flags = dataView.readInt8();
    autoIncrementStepValue = dataView.readInt8();
    
    // skip bytes
    dataView.readInt32(true);
    dataView.readInt32(true);
    dataView.readInt32(true);  // why do I need these 4 bytes of padding


    var description = {};
    description.name = name;
    description.type = type;
    description.displacement = displacement;
    description.fieldLength = fieldLength;
    description.decimalPlaces = decimalPlaces;
    description.flags = flags;
    description.autoIncrementStepValue = autoIncrementStepValue;
    return description;
};

function readDbfRecords(dataView, shapeFile)
{
    recordOffset = firstRecordPosition;
    recordSize = recordLength;

    numberOfRecords = numberOfRecords;
    console.log("number of records = " + numberOfRecords);
    for (var i = 0 ; i < numberOfRecords ; i++)
    {
	var recordHash = {};
	dataView.seek(recordOffset +1+ (i * recordSize));
	deleteFlag = dataView.readInt8;
	var numberOfFields = shapeFile.dbfFieldInfo.length;
	for (var j = 0 ; j < numberOfFields ; j++)
        {
	    currentField = shapeFile.dbfFieldInfo[j];
	    currentName = currentField.name;
	    currentValue = readDbfString(dataView, currentField.fieldLength).trim();

	    recordHash[currentName] = currentValue;
	}
	shapeFile.dbfRecords[i] = recordHash;
    }
};

function readDbfString(dataView, length)
{
    var returnString = "";
    for (var i = 0 ; i < length ; i++)
    {
	var tempChar = dataView.readInt8();
	if (tempChar != 0)
	{
	    returnString = returnString + String.fromCharCode(tempChar);
	}
    }
    return returnString;
};


var downloadCount = 0;
// from http://stackoverflow.com/questions/3749231/download-file-using-javascript-jquery
// modified to create a new iframe every time, needed to pull down multiple files
var downloadURL = function downloadURL(url) {
    var hiddenIFrameID = 'hiddenDownloader' + downloadCount,
    iframe = document.getElementById(hiddenIFrameID);
    if (iframe === null) {
        iframe = document.createElement('iframe');
        iframe.id = hiddenIFrameID;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }
    downloadCount++;
    console.log(downloadCount);
    iframe.src = url;
};


org.OpenGeoPortal.UserInterface.prototype.downloadDialog = function()
{
    //first, check to see if anything is in savedLayers & checked
    var layerList = this.getLayerList("download");
    foo = layerList;
    var dialogContent = "";
    var counter = 0;
    for (var i in layerList){
	counter++;
    }
    if (counter == 0)
    {
    	dialogContent = 'No layers have been selected.';
    } 
    else 
    {
	// download all layers in cart
	// even those that aren't marked for download 
	var cart = org.OpenGeoPortal.cartTableObj.getTableObj();
	var cartLayers = cart.fnGetData();
	for (var i = 0 ; i < cartLayers.length ; i++)
	{
	    var layer = cartLayers[i];
	    var download$ = layer[15];
	    var hash = jQuery.parseJSON(download$);
	    var fileDownload = hash.fileDownload;
	    fileDownload = fileDownload[0];
	    console.log(fileDownload);
	    downloadURL(fileDownload);
	}
    }
}

// use solrLayers global and display all the layers that aren't too big
function renderLayersTest()
{
    for (var i = 0 ; i < solrLayers.length ; i++)
    {
	var currentSolr = solrLayers[i];
	var size = currentSolr.SizeInBytes;
	var location$ = currentSolr.Location;
	console.log("location$ = " + location + ", size = " + size +", " + currentSolr);
	if (size && (size < 5000000) && location$)
	{
	    var location = jQuery.parseJSON(location$);
	    var url = location.fileDownload;
	    loadAndRenderShape(url);
	}
    }

}