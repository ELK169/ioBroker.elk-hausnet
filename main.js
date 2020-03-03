"use strict";

/*
 * Created with @iobroker/create-adapter v1.21.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");

// Load your modules here, e.g.:
const fs = require("fs");
const net = require("net");

const PingIntervall=10000;
const WDTime=30000; // Intervall des Watchdogs
const FSTimeout=2000;  // Zeit in ms, nach der geprüft wird, ob ein FS geschaltet hat
const DefaultsSetzenNach=10000; // Zeit in ms, nach der nach dem Start die Defaulwerte für FS gesetzt werden

var Controller;
// alle Objekte holen 
var HNObjekte = $("elk-hausnet.0.Obj.*");

class ElkHausnet extends utils.Adapter {

    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: "elk-hausnet",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("objectChange", this.onObjectChange.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() 
        {
        // Initialize your adapter here

        // Reset the connection indicator during startup
        this.setState("info.connection", false, true); // gelb

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info("Config-Dateipfad: " + this.config.Config);
        this.log.info("Controller-IP: " + this.config.ControllerIP);
        this.log.info("Controller-Port: " + this.config.ControllerPort);

        // Konfigurationsdateien laden
        this.log.info("Räume laden...");
        try 
          {
          var buf= fs.readFileSync(this.config.Config+"hnraeume.json");
          }
        catch (error) 
          {
          this.log.error("Fehler: "+error.toString());
          return;
          }
        this.log.info("Datei geladen: "+buf.length.toString()+" bytes");
        var HNRaeume=JSON.parse(buf.toString()); 
        this.log.info(HNRaeume.Raeume.length+ " Räume in Datei enthalten");
        HNRaeume.Raeume.forEach(element => 
            {
            this.log.info("Raum:"+element.name);
            // hier ggf. Objekte für die Räume anlegen
            });

        // Objekte laden
        this.log.info("Objekte laden...");
        buf= fs.readFileSync(this.config.Config+"hnobjekte.json");
        this.log.info("Datei geladen: "+buf.length.toString()+" bytes");
        var HN=JSON.parse(buf.toString()); 
        this.log.info(HN.Objekte.length+ " Objekte in Datei enthalten");
        HN.Objekte.forEach(element => 
            {
            this.log.info("Objekt anlegen: "+element.objname +" ("+element.name+")");
            switch(element.typ)
                {
                case "FS":
                case "REL":
                    this.setObjectNotExists("Obj."+element.typ+"."+element.objname, 
                    {
                    type: "state",
                    common: 
                        {
                        name: element.name,
                        type: "boolean",
                        role: "switch",
                        read: true,
                        write: true,
                        },
                    native:{"Nr": element.objnr, "AnzFehlerAktuell":0 , "AnzFehlerGesamt":0, "Aktiv":true}
                    });
                    break;
               case "IMP":
                    this.setObjectNotExists("Obj."+element.typ+"."+element.objname, 
                    {
                    type: "state",
                    common: 
                        {
                        name: element.name,
                        type: "boolean",
                        role: "button",
                        read: false,
                        write: true,
                        },
                    native:{"Nr": element.objnr, "AnzFehlerAktuell":0 , "AnzFehlerGesamt":0, "Aktiv":true}
                    });
                    break;
               case "DIMMER":
                   this.setObjectNotExists("Obj."+element.typ+"."+element.objname, 
                    {
                    type: "state",
                    common: 
                        {
                        name: element.name,
                        type: "number",
                        role: "level.dimmer",
                        read: true,
                        write: true,
                        },
                    native:{"Nr": element.objnr, "AnzFehlerAktuell":0 , "AnzFehlerGesamt":0, "Aktiv":true}
                    });
                break;
               case "FENSTER":
                    this.setObjectNotExists("Obj."+element.typ+"."+element.objname, 
                    {
                    type: "state",
                    common: 
                        {
                        name: element.name,
                        type: "boolean",
                        role: "sensor.window",
                        read: true,
                        write: false,
                        },
                    native:{"Nr": element.objnr, "AnzFehlerAktuell":0 , "AnzFehlerGesamt":0, "Aktiv":true}
                    });
                    break;
              case "TUER":
                    this.setObjectNotExists("Obj."+element.typ+"."+element.objname, 
                    {
                    type: "state",
                    common: 
                        {
                        name: element.name,
                        type: "boolean",
                        role: "sensor.door",
                        read: true,
                        write: false,
                        },
                    native:{"Nr": element.objnr, "AnzFehlerAktuell":0 , "AnzFehlerGesamt":0, "Aktiv":true}
                    });
                    break;
               case "RIEGEL":
                    this.setObjectNotExists("Obj."+element.typ+"."+element.objname, 
                    {
                    type: "state",
                    common: 
                        {
                        name: element.name,
                        type: "boolean",
                        role: "sensor.lock",
                        read: true,
                        write: false,
                        },
                    native:{"Nr": element.objnr, "AnzFehlerAktuell":0 , "AnzFehlerGesamt":0, "Aktiv":true}
                    });
                    break;
               case "TASTER":
                    this.setObjectNotExists("Obj."+element.typ+"."+element.objname, 
                    {
                    type: "state",
                    common: 
                        {
                        name: element.name,
                        type: "boolean",
                        role: "button",
                        read: true,
                        write: false,
                        },
                    native:{"Nr": element.objnr, "AnzFehlerAktuell":0 , "AnzFehlerGesamt":0, "Aktiv":true}
                    });
                    break;
               case "BM":
                    this.setObjectNotExists("Obj."+element.typ+"."+element.objname, 
                    {
                    type: "state",
                    common: 
                        {
                        name: element.name,
                        type: "boolean",
                        role: "sensor.motion",
                        read: true,
                        write: false,
                        },
                    native:{"Nr": element.objnr, "AnzFehlerAktuell":0 , "AnzFehlerGesamt":0, "Aktiv":true}
                    });
                    break;
               case "LS":
                    this.setObjectNotExists("Obj."+element.typ+"."+element.objname, 
                    {
                    type: "state",
                    common: 
                        {
                        name: element.name,
                        type: "boolean",
                        role: "sensor.alarm",
                        read: true,
                        write: false,
                        },
                    native:{"Nr": element.objnr, "AnzFehlerAktuell":0 , "AnzFehlerGesamt":0, "Aktiv":true}
                    });
                    break;
               case "KONTAKT":
                    this.setObjectNotExists("Obj."+element.typ+"."+element.objname, 
                    {
                    type: "state",
                    common: 
                        {
                        name: element.name,
                        type: "boolean",
                        role: "indicator",
                        read: true,
                        write: false,
                        },
                    native:{"Nr": element.objnr, "AnzFehlerAktuell":0 , "AnzFehlerGesamt":0, "Aktiv":true}
                    });
                    break;
             case "STROM":
                    this.setObjectNotExists("Obj."+element.typ+"."+element.objname, 
                    {
                    type: "state",
                    common: 
                        {
                        name: element.name,
                        type: "number",
                        role: "value.current",
                        read: true,
                        write: false,
                        },
                    native:{"Nr": element.objnr, "AnzFehlerAktuell":0 , "AnzFehlerGesamt":0, "Aktiv":true}
                    });
                    break;
               case "TEMP":
                    this.setObjectNotExists("Obj."+element.typ+"."+element.objname, 
                    {
                    type: "state",
                    common: 
                        {
                        name: element.name,
                        type: "number",
                        role: "value.temperature",
                        read: true,
                        write: false,
                        },
                    native:{"Nr": element.objnr, "AnzFehlerAktuell":0 , "AnzFehlerGesamt":0, "Aktiv":true}
                    });
                    break;
                case "HELL":
                    this.setObjectNotExists("Obj."+element.typ+"."+element.objname, 
                    {
                    type: "state",
                    common: 
                        {
                        name: element.name,
                        type: "number",
                        role: "value.brightness ",
                        read: true,
                        write: false,
                        },
                    native:{"Nr": element.objnr, "AnzFehlerAktuell":0 , "AnzFehlerGesamt":0, "Aktiv":true}
                    });
                    break;
                } // switch
            });


        // in this template all states changes inside the adapters namespace are subscribed
        this.subscribeStates("*");

   // Verbindung zum Controller aufbauen...
   this.log.info("Verbindungsaufbau zum Controller...");
        
   connectController(this.config.ControllerIP,this.config.ControllerPort);
   var WD=setInterval(OnWatchdog,WDTime);
   var HNObjekte = $("elk-hausnet.0.Obj.*");

   setTimeout(OnDefaultwerteSetzen,DefaultsSetzenNach);

   }



// nach kurzer Zeit Defaultwerte setzen und Fehlerzähler zurücksetzen
//if(element.defaultwert!=null)
//{
///this.setStateAsync("Obj."+element.typ+"."+element.objname,element.defaultwert,false);
//}


OnDefaultwerteSetzen()
 {
     // alle Objekte aus der Datei durchgehen und ggf. den Defaultwert setzen (FS aus z.B.)
     // Fehlerzähler zurücksetzen
 HN.Objekte.forEach(element => 
    {

        getObject("Obj."+element.typ+"."+element.objname, function(err,obj) 
        {   
        obj.native.AnzFehlerAktuell=0;
        if(obj.role=="switch" && element.defaultwert!=null)    
            {
            this.setState(obj,element.defaultwert,false);  // FS schalten, wenn erforderlich
            }
        });
    } 
    
}

    //////////////////////////////////////////////////////////////////
    // Es folgen Funktionen zum Zugriff auf die Controllerhardware
    //////////////////////////////////////////////////////////////////



    connectController(host,port)
    {
    log('Verbindungsversuch..');
    Connected=false;
    if (IntTmr != null) 
        {
        clearInterval(IntTmr);
        IntTmr=null;
        }
    if(Controller != null)
        { // ggf. vorhandene Verbindung entfernen
        Controller.end;
        Controller.destroy;
        }
    Controller=new net.Socket();
    Controller.setTimeout(5000);
    Controller.on('data',OnData);
    Controller.on('end',OnEnd);
    Controller.on('error', OnError);
    Controller.connect({host: host, port: port},OnConnect);
    }

    OnEnd()
    {
    Connected=false;
    Controller.end;
    Controller.destroy; 
    if (IntTmr != null)
        {
        clearInterval(IntTmr);
        IntTmr=null;
        }
    if(WD !=null)
        {
        clearInterval(WD);
        WD=null;
        }
    setState("info.connection", false, true);
    log('Verbindung getrennt');
    }


OnError(error)
{
    log('error: ' + error);
    if (IntTmr != null) 
        {
        clearInterval(IntTmr);
        IntTmr=null;
        }
    Connected=false;
    setState("info.connection", false, true);
    Controller.end();
    Controller.destroy();
  // nichts tun, der Watchdog kümmert sich drum
}


OnConnect()
{
   log("Mit Controller verbunden. Info abfragen...");
   setState("info.connection", true, true);
   Controller.write("?Info\0"); // Controller abfragen
   // Rest ergibt sich, wenn eine Antwort kommt
}

OnWatchdog()
{ // wird regelmäßig aufgerufen und schaut, wann der letzte Kontakt war
var zeit=(Date.now()-LetzterKontakt) / 1000;
var d=new Date(LetzterKontakt);
log("Watchdog: letzter Kontakt war "+d.toLocaleTimeString("de-DE")+", also vor "+ zeit.toFixed(3)+" s","debug");
if(zeit>30)
    { // zu lange nichts gehört, also neu verbinden
    log("Watchdog abgelaufen: neu verbinden","warn");
    Connected=false;
    connectController(this.config.ControllerIP,this.config.ControllerPort);
   }
}


OnData(data)
  {
  log(data.toString(),"debug");
  if(Connected) 
    LetzterKontakt=Date.now();  
  // jetzt die empfangenen Daten verarbeiten
  if(data.toString().startsWith("Info="))
    { // Antwort auf Info-Abfrage beim Start
    Connected=true;
    log("Verbindung bestätigt.")
    Controller.write("Start\0"); // Statusüberwachung starten
    IntTmr=setInterval(()=>{ if(Connected) {Controller.write("Ping\0"); log("Ping");} },PingIntervall); // alle 5 s Ping senden
    return;
    }
  if(data.toString().startsWith("gestartet"))
    { // Antwort auf Startbefehl
    log("Überwachung bestätigt.")
    Controller.write("?Obj*\0"); // alle Werte abfragen
    return;
    }

  if(data.toString().startsWith("Obj"))
    { // Zustandsmeldung
    var o=data.toString().slice(3,data.toString().indexOf("$"));
    var w=data.toString().slice(data.toString().indexOf("=")+1);
    log("neue Zustandsmeldung empfangen: ["+o+"] - ["+w+"]");
    var neuerWert=false;
    if(w.startsWith("1"))
        neuerWert=true;

    log("neuer Zustand von Objekt "+o+" ist "+w,"debug");
    // jetzt zugehöriges Objekt finden und Wert setzen (mit ack=true)
    var O=HoleHNObjekt(o);
    if(O!=null)
        setState(O,neuerWert,true);
    else
        log("Wertänderung für unbekanntes Objekt erhalten","warn");
    return;
    }
  }       


 HoleHNObjekt(suchNr)
    {
    var fund=null;
    HNObjekte.each(function(id, i) 
      {
      var O=getObject(id);
      if(O.native.Nr==suchNr)
        {
        fund=id;
        log("Objekt gefunden: "+fund.toString(),"debug");
        }
      });
      return fund;
    }




    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.log.info("cleaned everything up...");
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed object changes
     * @param {string} id
     * @param {ioBroker.Object | null | undefined} obj
     */
    onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // The object was deleted
            this.log.info(`object ${id} deleted`);
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} geändert: ${state.val} (ack = ${state.ack})`);
            if(state.ack==false)
                { // Status soll geändert werden...
                var Nr=id.native.Nr;
                var StNeu=0;
                if(state==true) StNeu=1;
                if(Nr==null) 
                {
                    this.log("Unbekanntes Objekt "+id.toString()+" soll geändert werden.","error");
                    return;
                }
                Controller.write("Obj"+Nr.toString()+"="+StNeu.toString()+"\0");
                // nun etwas warten und nachsehen, ob die Änderung gemeldet wurde...
                // nur bei FS
                if(id.role=="switch")
                    setTimeout(OnFSCheck(id,state),FSTimeout);
            }

        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }


    // hier landen wir kurze Zeit nach dem Schalten eines Fernschalters, um zu prüfen,
    // ob er wirklich geschaltet hat. Wenn nicht, neu versuchen.
    // bei zu vielen Fehlern melden.
    OnFSCheck(id, state)
    {



    }



    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.message" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    // 	if (typeof obj === "object" && obj.message) {
    // 		if (obj.command === "send") {
    // 			// e.g. send email or pushover or whatever
    // 			this.log.info("send command");

    // 			// Send response in callback if required
    // 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
    // 		}
    // 	}
    // }

}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new ElkHausnet(options);
} else {
    // otherwise start the instance directly
    new ElkHausnet();
}