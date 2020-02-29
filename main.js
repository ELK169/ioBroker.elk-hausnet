"use strict";

/*
 * Created with @iobroker/create-adapter v1.21.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");

// Load your modules here, e.g.:
const fs = require("fs");

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
    async onReady() {
        // Initialize your adapter here

        // Reset the connection indicator during startup
        this.setState("info.connection", false, true);

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info("Config-Dateipfad: " + this.config.Config);
        this.log.info("Controller-IP: " + this.config.ControllerIP);
        this.log.info("Controller-Port: " + this.config.ControllerPort);
        /*
        For every state in the system there has to be also an object of type state
        Here a simple template for a boolean variable named "testVariable"
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
        */

        // Verbindung zum Controller aufbauen...
        //
        //
        //
        //
        // Verbindung ist da, alles ok
        //this.setState("info.connection", true, true);
        //






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
        //this.log.info(buf.toString());
        this.log.info(HNRaeume.Raeume.length+ " Räume in Datei enthalten");
        HNRaeume.Raeume.forEach(element => 
            {
            this.log.info("Raum:"+element.name);
            });


        // Objekte laden

        this.log.info("Objekte laden...");
        buf= fs.readFileSync(this.config.Config+"hnobjekte.json");
        this.log.info("Datei geladen: "+buf.length.toString()+" bytes");
        var HN=JSON.parse(buf.toString()); 
        this.log.info(HN.Objekte.length+ " Objekte in Datei enthalten");
        HN.Objekte.forEach(element => 
            {
            this.log.info("Objekt anlegen:"+element.objname +" ("+element.name+")");

            switch(element.typ)
                {
                case "FS":
                case "REL":
                    this.setObjectNotExists(element.typ+"."+element.objname, 
                    {
                    type: "state",
                    common: {name: element.name,
                    type: "boolean",
                    role: "switch",
                    read: true,
                    write: true,
                    },
                    native: {}
                    });
                    if(element.defaultwert>=0)
                        {
                        this.setStateAsync(element.typ+"."+element.objname,element.defaultwert,false);
                        }
                    break;

               case "IMP":
               case "DIMMER":
               case "FENSTER":
               case "TUER":
               case "RIEGEL":
               case "TASTER":
               case "BM":
               case "LS":
               case "KONTAKT":
               case "STROM":
               case "TEMP":
               case "HELL":
                    break;

                } // switch


            });

        // in this template all states changes inside the adapters namespace are subscribed
        this.subscribeStates("*");




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
            //...

            // wenn es geklappt hat, dies melden:
            this.setStateAsync(id,state.val,true);

            }

        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
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