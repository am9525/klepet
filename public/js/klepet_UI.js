var checkImg = function(sporocilo){
  // /.../ - zacetek konec regexa
  // ^ - zacetek izraza
  // ? 0 ali 1 pojavitev s
  // \/  za frontslash
  // .{1,} ena ali vec pojavitev
  
  var imgRegex = /^https?:\/\/.{1,}\.(jpg|png|gif)$/i;
  
  var imgs = sporocilo.split(" ");
  
  for(var i = 0; i < imgs.length; i++){
    //pogledamo ce je ustrezen sort
    
    if(imgRegex.test(imgs[i])){
      console.log(sporocilo);
      sporocilo = sporocilo.replace(imgs[i],"<img style = \"margin-left:20px;\" src = \"" + imgs[i] + "\" width = \"200px\" alt = \" SugoiPicture \" />");
   
      
    }
  }
  return sporocilo;
};
var checkYt = function(sporocilo){
  // /.../ - zacetek konec regexa
  // ^ - zacetek izraza
  // ? 0 ali 1 pojavitev s
  // \/  za frontslash
  // .{1,} ena ali vec pojavitev
  
  var ytRegex = /^https?:\/\/www.youtube.com\/watch\?v=.{1,}$/i;
  
  var yt = sporocilo.split(" ");
  
  for(var i = 0; i < yt.length; i++){
    //pogledamo ce je ustrezen sort
    
    if(ytRegex.test(yt[i])){
      console.log(sporocilo);
      var ytSrc = "https://www.youtube.com/embed/" + yt[i].split("?v=")[1];
      sporocilo = sporocilo.replace(yt[i], "<iframe style = \"margin-left:20px;\" src = \"" + ytSrc + "\" width = \"200px\" height = \"150px\" allowfullscreen></iframe>");
      
    }
  }
  return sporocilo;
};
function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  if (jeSmesko) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace('&lt;img', '<img').replace('png\' /&gt;', 'png\' />');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    var slika_video = checkImg(sporocilo);
    slika_video = checkYt(slika_video);
    // pogledamo ce je dejansko bla kaksna slika v sporocilu
    if(sporocilo.localeCompare(slika_video))
      return $('<div style="font-weight: bold;"></div>').html(slika_video);
    else
      return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
    var slika_video = checkImg(sporocilo);
    slika_video = checkYt(slika_video);
  return $('<div></div>').html('<i>' + slika_video + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
      $("#seznam-uporabnikov div").click(function() {
      	$("#poslji-sporocilo").focus();
      	$("#poslji-sporocilo").val("/zasebno \"" + $(this).text() + "\" ");
      });
    }
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}
