"use strict";

/*
 * Created with @iobroker/create-adapter v1.21.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const fs = require("fs");
const net = require("net");
//const PingIntervall=10000;// neu: PingZeit
//const WDTime=30000; // Intervall des Watchdogs// neu: WDZeit
//const FSTimeout=1000;  // Zeit in ms, nach der geprüft wird, ob ein FS geschaltet hat// neu: FSCheckZeit
//const DefaultsSetzenNach=5000; // Zeit in ms, nach der nach dem Start die Defaulwerte für FS gesetzt werden// neu: DefaultsSetzenNach
//const MaxFSWdh=3; // maximale Anzahl von Wiederholungen, wenn ein FS nicht schaltet// neu: FSVersuche

var PingZeit=10000;
var WDZeit=30000;
var FSTimeout=3000;
var DefaultsSetzenNach=10000;
var FSVersuche=3;

var WD; // Watchdog
var LetzterKontakt=Date.now();
var IntTmr=null;
var Connected=false;
var Controller;
var HNRaeume;
var HN;


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
        var buf;
        // Reset the connection indicator during startup
        this.setState("info.connection", false, true); // gelb


        this.log.debug("1: FSTimeout: " + FSTimeout);
        this.log.debug("2: FSTimeout: " + this.FSTimeout);
        this.log.debug("3: FSTimeout: " + this.config.FSCheckZeit);

        this.PingZeit=this.config.PingZeit;
        this.WDZeit=this.config.WDZeit;
        this.FSTimeout=this.config.FSCheckZeit;
        this.DefaultsSetzenNach=this.config.DefaultsSetzenNach;
        this.FSVersuche=this.config.FSVersuche;

        this.log.debug("4: FSTimeout: " + FSTimeout);
        this.log.debug("5: FSTimeout: " + this.FSTimeout);
        this.log.debug("6: FSTimeout: " + this.config.FSCheckZeit);


        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info("Config-Dateipfad: " + this.config.Config);
        this.log.info("Controller-IP: " + this.config.ControllerIP);
        this.log.info("Controller-Port: " + this.config.ControllerPort);
        this.log.info("PingZeit: " + PingZeit);
        this.log.info("FSTimeout: " + FSTimeout);
        this.log.info("FSVersuche: " + FSVersuche);
        this.log.info("WDZeit: " + WDZeit);
        this.log.info("DefaultsSetzenNach: " + DefaultsSetzenNach);

        //const PingIntervall=10000;// neu: PingZeit
//const WDTime=30000; // Intervall des Watchdogs// neu: WDZeit
//const FSTimeout=2000;  // Zeit in ms, nach der geprüft wird, ob ein FS geschaltet hat// neu: FSCheckZeit
//const DefaultsSetzenNach=5000; // Zeit in ms, nach der nach dem Start die Defaulwerte für FS gesetzt werden// neu: DefaultsSetzenNach
//const MaxFSWdh=3; // maximale Anzahl von Wiederholungen, wenn ein FS nicht schaltet// neu: FSVersuche

        // Konfigurationsdateien laden
        // this.log.info("Räume laden...");
        // try 
        //   {
        //   var buf= fs.readFileSync(this.config.Config+"hnraeume.json");
        //   }
        // catch (error) 
        //   {
        //   this.log.error("Fehler: "+error.toString());
        //   return;
        //   }
        // this.log.debug("Datei geladen: "+buf.length.toString()+" bytes");
        // HNRaeume=JSON.parse(buf.toString()); 
        // this.log.debug(HNRaeume.Raeume.length+ " Räume in Datei enthalten");
        // HNRaeume.Raeume.forEach(element => 
        //     {
        //     this.log.info("Raum:"+element.name);
        //     // hier ggf. Objekte für die Räume anlegen
        //     });

        // Objekte laden
        this.log.info("Objekte laden aus: "+this.config.Config+"HNObjekte.json");
        buf= fs.readFileSync(this.config.Config+"HNObjekte.json");
        this.log.debug("Datei geladen: "+buf.length.toString()+" bytes");
        HN=JSON.parse(buf.toString()); 
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
                        role: "value.brightness",
                        read: true,
                        write: false,
                        },
                    native:{"Nr": element.objnr, "AnzFehlerAktuell":0 , "AnzFehlerGesamt":0, "Aktiv":true}
                    });
                    break;
                } // switch

            // hier kommen wir an, wenn das Objekt erzeugt wurde
            // jetzt wird es noch zur Raum- und Funktionsliste hinzugefügt

            // this.log.debug("Objekt "+element.objname+" wurde angelegt oder war vorhanden.");
            // this.log.debug("jetzt Raum  "+element.raum+" laden.");

            // this.getObject("enum.rooms."+element.raum, (enu)=>
            //     {
            //     this.log.debug("enum.rooms."+element.raum + " = "+ enu);
            //     if (enu) 
            //         { // nur, wenn es den Raum auch gibt
            //         this.log.debug("Raum "+element.raum+" ist vorhanden.");
            //         var pos = enu.common.members.indexOf(newStateId);
            //         if (pos === -1) 
            //             { // nur, wenn nicht schon da
            //             this.log.debug("Raum "+element.raum+" ist in der Aufzählung "+enu.common.members+" noch nicht vorhanden, also hinzufügen.");
            //             enu.common.members.push(newStateId);
            //             enu.from = "system.adapter.elk-hausnet.0.Obj."+element.typ+"."+element.objname;
            //             enu.ts = new Date().getTime();
            //             setObject(enumName, enu);
            //             }
            //         }
            //     else
            //         {
            //         this.log.error("Raum "+element.raum+" nicht gefunden.");
            //         }
            //     });
            
            

/*

            var func;
            switch(element.typ)
                {   
                case   "FS": func="fernschalter"; break;
                case   "SD": func="steckdose"; break;
                case   "LI": func="licht"; break;
                case   "REL": func="relais"; break;
                case   "IMP": func="impulsgeber"; break;
                case   "DIMMER": func="licht"; break;
                case   "FENSTER": func="fensterkontakt"; break;
                case   "TUER": func="türkontakt"; break;
                case   "RIEGEL": func="schloss"; break;
                case   "TASTER": func="taster"; break;
                case   "BM": func="bewegungsmelder"; break;
                case   "LS": func="kontakt"; break;
                case   "KONTAKT": func="kontakt"; break;
                case   "STROM": func="messwert"; break;
                case   "TEMP": func="messwert"; break;
                case   "HELL": func="messwert"; break;
                }
            enu = getObject("enum.functions."+func);
            if (enu) 
                { // nur, wenn es die Funktion auch gibt
                var pos = enu.common.members.indexOf(newStateId);
                if (pos === -1) 
                    { // nur, wenn nicht schon da
                    enu.common.members.push(newStateId);
                    enu.from = "system.adapter.elk-hausnet.0.Obj."+element.typ+"."+element.objname;
                    enu.ts = new Date().getTime();
                    setObject(enumName, enu);
                    }
                }


*/

            });

        // in this template all states changes inside the adapters namespace are subscribed
        this.subscribeStates("*");

    // Verbindung zum Controller aufbauen...
    this.log.info("Verbindungsaufbau zum Controller...");
        
    this.connectController(this.config.ControllerIP,this.config.ControllerPort);
    this.log.debug("nach Verbindungsaufbau zum Controller.");
    WD=setInterval(()=>{this.OnWatchdog();},WDZeit);
    setTimeout(()=>{this.OnDefaultwerteSetzen(HN.Objekte,this);},DefaultsSetzenNach);
}



// nach kurzer Zeit Defaultwerte setzen und Fehlerzähler zurücksetzen
//if(element.defaultwert!=null)
//{
///this.setStateAsync("Obj."+element.typ+"."+element.objname,element.defaultwert,false);
//}


OnDefaultwerteSetzen(Objekte,A)
 {


// test!!
/*
this.log.info("vor getObjectList...");

adapter.objects.getObjectList({
        startkey: adapter.namespace + '.Obj.',
        endkey:   adapter.namespace + '.Obj.\u9999'},liste=>{this.log.info(liste.stringify())});

        this.log.info("nach getObjectList.");

//this.getState("Obj.FS.FS001",element => {this.log.info(element.id);});

/*
//var HNObjekte; elk-hausnet.0.Obj.
adapter.getStates('*', (err, states) => 
    {
    this.log.info("in getStates...");
  //  HNObjekte=states;
    for(var id in states)
        {
        this.log.info(id.toString() + JSON.stringify(id));
        }

    }); 

*/



     // alle Objekte aus der Datei durchgehen und ggf. den Defaultwert setzen (FS aus z.B.)
     // Fehlerzähler zurücksetzen
 A.log.info("Defaultwerte setzen...");
 Objekte.forEach( (element) =>
    {
        var OName=A.namespace+".Obj."+element.typ+"."+element.objname;

        A.log.debug("Objekt holen: "+ OName);

        A.getObject(OName, (err,obj) =>
        {   
            if(obj==null || obj==undefined) 
            {
                A.log.debug("Objekt ist null!");
            }
            else
            {
            A.log.debug("Objekt geholt: "+obj.toString());

            A.log.debug(obj.common.name.toString());
            A.log.debug(obj.native.Nr);
            A.log.debug(obj.common.role);
            
           

            obj.native.AnzFehlerAktuell=0;
        if(obj.common.role=="switch" && element.defaultwert!=null)    
            {
//                A.getState(obj.common.name, (err,state)=>{A.log.debug("jetziger Objektwert ist "+state.val.toString());})   ;
                A.getState(obj, (err,state)=>{A.log.debug("Objektwert vorher ist "+state.val.toString());})   ;
           
            A.log.debug("Objekt auf "+element.defaultwert.toString()+" setzen.");
            A.setState(obj._id,element.defaultwert,false);  // FS schalten, wenn erforderlich

           // A.getState(obj, (err,state)=>{A.log.debug("Objektwert hinterher ist "+state.val.toString());})   ;

//            A.log.debug("Objektwert hinterher ist "+obj.val.toString());
            }
        }
        });
    })
}

    //////////////////////////////////////////////////////////////////
    // Es folgen Funktionen zum Zugriff auf die Controllerhardware
    //////////////////////////////////////////////////////////////////



  connectController(host,port)
    {
    this.log.info('Verbindungsversuch..');
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
    Controller.Ada=this;
    Controller.setTimeout(5000);
    Controller.on('data',this.OnData);
    Controller.on('end',this.OnEnd);
    Controller.on('error',this.OnError);
    
    Controller.connect({host: host, port: port},this.OnConnect);
    this.log.debug('nach Verbindungsversuch..');
    }


OnEnd()
    {
    Connected=false;
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
    Controller.Ada.setState("info.connection", false, true);
    Controller.Ada.log.info('Verbindung getrennt');
    Controller.end;
    Controller.destroy; 
   }


OnError(error)
{
    Controller.Ada.log.error('error: ' + error);
    if (IntTmr != null) 
        {
        clearInterval(IntTmr);
        IntTmr=null;
        }
    Connected=false;
    Controller.Ada.setState("info.connection", false, true);
    Controller.end();
    Controller.destroy();
  // nichts tun, der Watchdog kümmert sich drum
}


OnConnect()
{
   Controller.Ada.log.info("Mit Controller verbunden. Info abfragen...");
   Controller.Ada.setState("info.connection", true, true);
   Controller.write("?Info\0"); // Controller abfragen
   // Rest ergibt sich, wenn eine Antwort kommt
}

OnWatchdog()
{ // wird regelmäßig aufgerufen und schaut, wann der letzte Kontakt war
var zeit=(Date.now()-LetzterKontakt) / 1000;
var d=new Date(LetzterKontakt);
this.log.debug("Watchdog: letzter Kontakt war "+d.toLocaleTimeString("de-DE")+", also vor "+ zeit.toFixed(3)+" s");
if(zeit>30)
    { // zu lange nichts gehört, also neu verbinden
    this.log.warn("Watchdog abgelaufen: neu verbinden");
    Connected=false;
    this.connectController(this.config.ControllerIP,this.config.ControllerPort);
   }
}


OnData(data)
  {
  Controller.Ada.log.debug(data.toString());
  if(Connected) 
    LetzterKontakt=Date.now();  
  // jetzt die empfangenen Daten verarbeiten
  if(data.toString().startsWith("Info="))
    { // Antwort auf Info-Abfrage beim Start
    Connected=true;
    Controller.Ada.log.info("Verbindung bestätigt.")
    Controller.write("Start\0"); // Statusüberwachung starten
    IntTmr=setInterval(()=>{ if(Connected) {Controller.write("Ping\0"); Controller.Ada.log.debug("Ping");} },PingZeit); // alle 5 s Ping senden
    return;
    }
  if(data.toString().startsWith("gestartet"))
    { // Antwort auf Startbefehl
    Controller.Ada.log.info("Überwachung bestätigt.")
    Controller.write("?Obj*\0"); // alle Werte abfragen
    return;
    }

  if(data.toString().startsWith("Obj"))
    { // Zustandsmeldung
    var o=data.toString().slice(3,data.toString().indexOf("$"));
    var w=data.toString().slice(data.toString().indexOf("=")+1);
    Controller.Ada.log.debug("neue Zustandsmeldung empfangen: ["+o+"] - ["+w+"]");
    var neuerWert=false;
    if(w.startsWith("1"))
        neuerWert=true;

    Controller.Ada.log.info("neuer Zustand von Objekt "+o+" ist "+w);
    // jetzt zugehöriges Objekt finden und Wert setzen (mit ack=true)
    var O=Controller.Ada.HoleHNObjekt(o,Controller.Ada);
    if(O!=null)
        {
        Controller.Ada.log.debug("Objekt gefunden "+O);    
        Controller.Ada.setState(O,neuerWert,true);
        }
    else
        Controller.Ada.log.warn("Wertänderung für unbekanntes Objekt erhalten");
    return;
    }
  }       


 HoleHNObjekt(suchNr,A)
    {
    this.log.debug("suchen nach "+suchNr);
    var fund=HN.Objekte.find(el=>el.objnr==suchNr);
    if(!fund)
        { // nicht gefunden
        return null;
        }
    this.log.debug("Ergebnis: "+fund);
    return(A.namespace+".Obj."+fund.typ+"."+fund.objname);
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
    onStateChange(id, state) 
        {
        if (state) {
            // The state was changed
            this.log.debug(`state ${id} geändert: ${state.val} (ack = ${state.ack})`);
            if(state.ack==false)
                { // Status soll geändert werden...
                if(Connected)
                    {
                    var StNeu=0;
                    if(state.val) StNeu=1;

                    // Objektnummer holen
                    this.getObject(id,(err,obj)=>
                        {
                        if(obj)
                            {
                            this.log.debug("Objekt #"+obj.native.Nr+" auf "+StNeu+" setzen");
                            Controller.write("Obj"+obj.native.Nr.toString()+"="+StNeu+"\0");
                            if(obj.common.role=="switch")
                                {
                                this.log.debug("OnFSCheck planen: "+FSTimeout+" ms");

                                this.log.debug("7: FSTimeout: " + FSTimeout);
                                this.log.debug("8: FSTimeout: " + this.FSTimeout);
                                this.log.debug("9: FSTimeout: " + this.config.FSCheckZeit);
                        


                                setTimeout(()=>{this.OnFSCheck(id,state)},FSTimeout);
                                }
                            }
                        });
                    }
                else
                    {
                    this.log.error("Offline! Status kann nicht geändert werden.");
                    }
                }
            }
        else 
            {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
            }
        }


    // hier landen wir kurze Zeit nach dem Schalten eines Fernschalters, um zu prüfen,
    // ob er wirklich geschaltet hat. Wenn nicht, neu versuchen.
    // bei zu vielen Fehlern melden.
    OnFSCheck(id, sollstate)
    {
    this.log.debug("OnFSCheck: prüfen, ob "+id+" auf "+sollstate.val+" gesetzt wurde.");
    this.getState(id, (err,state)=>
        {
        this.log.debug("Objektwert ist "+state.val.toString()+" ack="+state.ack+"  -  soll: "+sollstate.val);
        if((state.val==sollstate.val) && state.ack)
            {
            this.log.debug("Objekt wurde erfolgreich geschaltet, Bestätigung ist da.");
            // Fehlerzähler auf 0 setzen
            this.getObject(id,(err,obj)=>
                {
                this.log.debug("Fehlerzähler von "+obj.common.id+" auf 0 setzen");
                obj.native.AnzFehlerAktuell=0;
                this.setObject(id,obj);
                this.log.debug("Fehlerzähler auf 0 gesetzt");
                });
            }
        else
            { 
            this.log.warn("Objektänderung von "+id+" wurde nicht bestätigt");
            // Fehlerzähler hochzählen, wenn verbunden
            if(Connected)
                {
                this.getObject(id,(err,obj)=>
                    {
                    this.log.debug("Fehlerzähler von "+obj.native.AnzFehlerAktuell+" um 1 erhöhen");
                    obj.native.AnzFehlerAktuell++;
                    this.setObject(id,obj);
                    if(obj.native.AnzFehlerAktuell > FSVersuche)
                        { // zu viele Fehler
                        obj.native.AnzFehlerAktuell=0;
                        obj.native.AnzFehlerGesamt++;
                        this.setObject(id,obj);
                        // jetzt nochmal den aktuellen Status abfragen, dann ist wieder alles synchron...
                        Controller.write("?Obj"+obj.native.Nr.toString()+"\0");
                        this.OnPermanentFehler(id);
                        }
                    else
                        {   // nochmal versuchen
                        this.log.debug("Neuer Versuch, Objekt "+id+" auf "+sollstate.val+" zu setzen");
                        var StN=0;
                        if(sollstate.val) StN=1;
                        if(Connected)
                            Controller.write("Obj"+obj.native.Nr.toString()+"="+StN+"\0");
                        this.log.debug("OnFSCheck planen");
                        setTimeout(()=>{this.OnFSCheck(id,state)},FSTimeout);
                        }
                    }); // getObject
                }  // if(Connected)
            } // else
        }); // getState
    }




    OnPermanentFehler(id)
        {
        this.log.error("nicht behebbarer Fehler bei "+id);
        // ggf. weitere Benachrichtigungen...

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