

// ========================
// DEVICES

/**
 * This class represents one device (a single motor, sensor or LED).
 */
class Device {
    /**
     * @returns {string} The type of this device. This method is overridden by its subclasses.
     */
    static getDeviceType() {
        throw new Error("This method should be overridden");
    }

    /**
     * @param {Function} funcSendToServer - Function for sending new values to the server
     * @param {string} port - Port name as it is used internally by ev3dev, e.g. "ev3-ports:in1"
     * @param {string} portName - Human-readable port name, e.g. "1"
     */
    constructor(funcSendToServer, port, portName) {
        this.funcSendToServer = funcSendToServer;
        this.port = port;
        this.portName = portName;

        /** @type {Object.<string, AttributeSetter>} */
        this.attributeSetters = {};  // Maps attribute names to AttributeSetter instances

        /** @type {Object.<string, AttributeSender>} */
        this.attributeSenders = {};  // Maps attribute names to AttributeSender instances

        /** @type {Object.<string, any>} */
        this.attributeValues = {};  // Maps attribute names to the current value
    }

    /**
     * This method is called whenever the website receives the information from the server that the device has been disconnected.
     * The method resets all attribute values.
     */
    onDeviceDisconnected() {
        this.attributeValues = {};
        for (let setter of Object.values(this.attributeSetters)) {
            setter.set(null);
            setter.setDisabled(true);
        }
        for (let sender of Object.values(this.attributeSenders)) {
            sender.setDisabled(true);
        }
    }

    /**
     * Update attribute values of this device. This method is called when new values are received from the server.
     * @param {Object.<string, string>} values - Maps attribute names to new values
     */
    updateValues(values) {
        for (let [attrName, attrValue] of Object.entries(values)) {
            const setter = this.attributeSetters[attrName];
            if (!setter) {
                console.error("Could not find attribute '" + attrName + "'");
                continue;
            }
            this.attributeValues[attrName] = setter.set(attrValue);
            setter.setDisabled(false);
        }
        for (let sender of Object.values(this.attributeSenders)) {
            sender.setDisabled(false);
        }
    }

    /**
     * This method is called by {@link AttributeSender}s when a value of an attribute has been changed and should be sent to the server.
     * @param {string} attrName - Attribute name
     * @param {string} newValue - New value for the attribute
     */
    onUpdateValue(attrName, newValue) {
        this.attributeValues[attrName] = newValue;
        this.funcSendToServer({ type: this.constructor.getDeviceType(), port: this.port, attributes: { [attrName]: newValue } });
    }
}

/**
 * Represents one motor port
 */
class MotorDevice extends Device {
    static getDeviceType() {
        return "motor";
    }

    /**
     * @param {Function} funcSendToServer - See {@link Device#constructor}
     * @param {string} port - See {@link Device#constructor}
     * @param {string} portName - See {@link Device#constructor}
     * @param {HTMLElement} card - The {@link HTMLElement} that represents this motor
     */
    constructor(funcSendToServer, port, portName, card) {
        super(funcSendToServer, port, portName);
        this.attributeSetters = {
            "position": new MotorPositionAttributeSetter(this, card.getElementsByClassName("positionDisplay")[0]),
            "driver_name": new DriverNameAttributeSetter(this, card.getElementsByClassName("port")[0]),
            "duty_cycle_sp": new InputAttributeSetter(this, card.getElementsByClassName("duty_cycle_sp")[0]),
            "polarity": new PredefinedSelectAttributeSetter(this, card.getElementsByClassName("polarity")[0]),
            "position_sp": new InputAttributeSetter(this, card.getElementsByClassName("position_sp")[0]),
            "speed_sp": new InputAttributeSetter(this, card.getElementsByClassName("speed_sp")[0]),
            "ramp_up_sp": new InputAttributeSetter(this, card.getElementsByClassName("ramp_up_sp")[0]),
            "ramp_down_sp": new InputAttributeSetter(this, card.getElementsByClassName("ramp_down_sp")[0]),
            "stop_action": new SelectAttributeSetter(this, card.getElementsByClassName("stop_action")[0]),
            "time_sp": new InputAttributeSetter(this, card.getElementsByClassName("time_sp")[0]),
            "command": new SelectAttributeSetter(this, card.getElementsByClassName("command")[0])
        };
        this.attributeSenders = {
            "position": new InputAttributeSenderOnButton(this, "position", card.getElementsByClassName("positionInput")[0], card.getElementsByClassName("sendPositionButton")[0]),
            "duty_cycle_sp": new InputAttributeSender(this, "duty_cycle_sp", card.getElementsByClassName("duty_cycle_sp")[0]),
            "polarity": new SelectAttributeSender(this, "polarity", card.getElementsByClassName("polarity")[0]),
            "position_sp": new InputAttributeSender(this, "position_sp", card.getElementsByClassName("position_sp")[0]),
            "speed_sp": new InputAttributeSender(this, "speed_sp", card.getElementsByClassName("speed_sp")[0]),
            "ramp_up_sp": new InputAttributeSender(this, "ramp_up_sp", card.getElementsByClassName("ramp_up_sp")[0]),
            "ramp_down_sp": new InputAttributeSender(this, "ramp_down_sp", card.getElementsByClassName("ramp_down_sp")[0]),
            "stop_action": new SelectAttributeSender(this, "stop_action", card.getElementsByClassName("stop_action")[0]),
            "time_sp": new InputAttributeSender(this, "time_sp", card.getElementsByClassName("time_sp")[0]),
            "command": new SelectAttributeSenderOnButton(this, "command", card.getElementsByClassName("command")[0], card.getElementsByClassName("sendCommandButton")[0])
        };
    }
}

/**
 * Represents one sensor port
 */
class SensorDevice extends Device {
    static getDeviceType() {
        return "sensor";
    }

    /**
     * @param {Function} funcSendToServer - See {@link Device#constructor}
     * @param {string} port - See {@link Device#constructor}
     * @param {string} portName - See {@link Device#constructor}
     * @param {HTMLElement} card - The {@link HTMLElement} that represents this sensor
     */
    constructor(funcSendToServer, port, portName, card) {
        super(funcSendToServer, port, portName);
        this.attributeSetters = {
            "values": new SensorValuesAttributeSetter(this, card.getElementsByClassName("values")[0]),
            "driver_name": new DriverNameAttributeSetter(this, card.getElementsByClassName("port")[0]),
            "mode": new SelectAttributeSetter(this, card.getElementsByClassName("mode")[0]),
            "command": new SelectAttributeSetter(this, card.getElementsByClassName("command")[0])
        };
        this.attributeSenders = {
            "mode": new SelectAttributeSender(this, "mode", card.getElementsByClassName("mode")[0]),
            "command": new SelectAttributeSenderOnButton(this, "command", card.getElementsByClassName("command")[0], card.getElementsByClassName("sendCommandButton")[0])
        };
    }
}

/**
 * Represents one LED
 */
class LedDevice extends Device {
    static getDeviceType() {
        return "led";
    }

    /**
     * @param {Function} funcSendToServer - See {@link Device#constructor}
     * @param {string} port - See {@link Device#constructor}
     * @param {string} portName - See {@link Device#constructor}
     * @param {HTMLElement} card - The {@link HTMLElement} that represents this LED
     */
    constructor(funcSendToServer, port, portName, card) {
        super(funcSendToServer, port, portName);
        card.getElementsByClassName("port")[0].textContent = portName.toUpperCase();
        this.attributeSetters = {
            "green": new InputAttributeSetter(this, card.getElementsByClassName("greenLed")[0]),
            "red": new InputAttributeSetter(this, card.getElementsByClassName("redLed")[0]),
        };
        this.attributeSenders = {
            "green": new InputAttributeSender(this, "green", card.getElementsByClassName("greenLed")[0]),
            "red": new InputAttributeSender(this, "red", card.getElementsByClassName("redLed")[0])
        }
    }

    onUpdateValue(attrName, newValue) {
        this.attributeValues[attrName] = newValue;
        this.funcSendToServer({ type: this.constructor.getDeviceType(), port: this.port, attributes: { [attrName]: newValue } },
            this.port + "-" + attrName);  // second parameter "this.port + "-" + attrName" specifies that if a new value with the same id is encountered, this overrides the old one. 
    }
}



// ========================
// ATTRIBUTE SETTERS

/**
 * Instances of this class are responsible for setting a value of a single attribute.
 */
class AttributeSetter {
    /**
     * @param {Device} device - The device this attribute belongs to.
     * @param {Element} elem - HTML input element on which the value is set.
     */
    constructor(device, elem) {
        this.device = device;
        this.elem = elem;
        this.set(null);
    }

    /**
     * Set the attribute's value to {@link value}. 
     * @param {(string|null)} value - New value
     * @returns {string} The value that should be stored inside {@link this.device.attributeValues}
     */
    set(value) { 
        return value;
    }

    setDisabled(disabled) {
        this.elem.disabled = disabled;
    }
}

/**
 * Used for setting the value of an <input> tag.
 */
class InputAttributeSetter extends AttributeSetter {
    set(value) {
        if (value != null) {
            this.elem.value = value;
        } else {
            this.elem.value = this.elem.getAttribute("initValue");
        }
        return super.set(value);
    }
}

/**
 * Used for setting the value of a <select> tag.
 * Values for this type of <select> tag are predefined and are not sent by the server.
 * Instance of this class are used for setting motor polarity, because polarity always has only two possible values
 * ("normal" and "inversed"). For other <select> tags, {@link SelectAttributeSetter} is used.
 */
class PredefinedSelectAttributeSetter extends AttributeSetter {
    set(value) {
        if (value != null) {
            for (let i = 0; i < this.elem.options.length; i++) {
                if (this.elem.options[i].text === value) {
                    this.elem.selectedIndex = i;
                    break;
                }
            }
        } else {
            this.elem.selectedIndex = 0;
        }
        return super.set(value);
    }
}

/**
 * Used for setting the value of a <select> tag.
 * Values are sent by the server.
 * This Setter is used for e.g. sensor modes and commands.
 */
class SelectAttributeSetter extends AttributeSetter {
    /**
     * The value parameter can have three types:
     *   * A string: In this case, the server sent only the name of the option that should be set as active
     *   * An array of strings: In this case, the server sent a list of possible values, but no currently selected value.
     *                          This is used for commands. There is no "currently active command", but instead, there is
     *                          a list of possible commands from which the user can choose one.
     *   * An Object containing values and a selected value: In this case, the server sent a list of possible options
     *                                                       and the name of the currently active option. This is used
     *                                                       for e.g. sensor modes.
     * @param value {(string|Array<string>|{values: Array<string>, selected: string})} - new values
     * @returns {string} See {@link AttributeSetter#set}
     */
    set(value) {
        if (typeof value === "string") {
            // only a string (which is the selected option) is sent by the server
            for (let i = 0; i < this.elem.options.length; i++) {
                if (this.elem.options[i].text === value) {
                    this.elem.selectedIndex = i;
                    break;
                }
            }
            return value;
        } 
        while (this.elem.options.length > 0)
            this.elem.remove(0);
        if (value != null) {
            let values;
            let selected;
            if (Array.isArray(value)) {
                // this is for selects where option is not saved (e.g. commands. They can only be sent, but are not stored - in contrast to modes)
                values = value;
                selected = null;
            } else {
                // the server sent an object containing both values and the selected option
                values = value["values"];
                selected = value["selected"];
            }
            for (let i = 0; i < values.length; i++) {
                const option = document.createElement("option");
                option.text = values[i];
                this.elem.appendChild(option);
                if (values[i] === selected) {
                    this.elem.selectedIndex = i;
                }
            }
            return selected;
        }
        return super.set(value);
    }
}

/**
 * Used for setting the name of a device (the port).
 */
class DriverNameAttributeSetter extends AttributeSetter {
    set(value) {
        if (value != null) {
            // for some sensors and motors, translate the device name into something more human-readable
            const translated = {
                "lego-ev3-us": "EV3 Ultrasonic Sensor",
                "lego-ev3-gyro": "EV3 Gyro Sensor",
                "lego-ev3-color": "EV3 Color Sensor",
                "lego-ev3-touch": "EV3 Touch Sensor",
                "lego-ev3-ir": "EV3 Infrared Sensor",

                "lego-ev3-m-motor": "EV3 Medium Servo Motor",
                "lego-ev3-l-motor": "EV3 Large Servo Motor",

                "lego-nxt-temp": "NXT Temperature Sensor",
                "lego-nxt-light": "NXT Light Sensor",
                "lego-nxt-sound": "NXT Sound Sensor",
                "lego-nxt-us": "NXT Ultrasonic Sensor"
            }[value] || value;
            this.elem.textContent = translated + " (" + this.device.portName + ")";
        } else {
            this.elem.textContent = "Port " + this.device.portName;
        }
        return super.set(value);
    }
}

/**
 * Used for setting the motor position.
 */
class MotorPositionAttributeSetter extends AttributeSetter {
    set(value) {
        if (value != null) {
            this.elem.textContent = value;
        } else {
            this.elem.textContent = "<None>";
        }
        return super.set(value);
    }
}

/**
 * Used for setting a sensor value.
 */
class SensorValuesAttributeSetter extends AttributeSetter {
    set(value) {
        if (value != null) {
            let translated = value;
            try {
                // translate values of some sensors into something more human-readable
                switch (this.device.attributeValues["driver_name"]) {
                    case "lego-ev3-color":
                        if (this.device.attributeValues["mode"] === "COL-COLOR") {
                            translated = {
                                "0": '<span class="circle"></span>No Color (0)',
                                "1": '<span class="circle black-circle"></span>Black (1)',
                                "2": '<span class="circle blue-circle"></span>Blue (2)',
                                "3": '<span class="circle green-circle"></span>Green (3)',
                                "4": '<span class="circle yellow-circle"></span>Yellow (4)',
                                "5": '<span class="circle red-circle"></span>Red (5)',
                                "6": '<span class="circle white-circle-with-border"></span>White (6)',
                                "7": '<span class="circle brown-circle"></span>Brown (7)'
                            }[value] || value;
                        }
                        break;
                    case "lego-ev3-touch":
                        translated = {
                            "0": "Released (0)",
                            "1": "Pressed (1)"
                        }[value] || value;
                        break;
                    case "ms-line-leader":
                        if (this.device.attributeValues["mode"] === "CAL") {
                            let values = value.split(" ");
                            let t = "";
                            for (let v of values) {
                                let color = parseInt(v) * 2.55;
                                t += `<span class="black-border-rect" style="background-color: rgb(${color}, ${color}, ${color})"></span>`;
                            }
                            translated = t;
                            break;
                        } else if (this.device.attributeValues["mode"] === "RAW") {
                            let values = value.split(" ");
                            let t = "";
                            for (let v of values) {
                                let color = parseInt(v);
                                t += `<span class="black-border-rect" style="background-color: rgb(${color}, ${color}, ${color})"></span>`;
                            }
                            translated = t;
                            break;
                        }
                        break;
                    /*case "lego-ev3-ir":
                        if (this.device.attributeValues["mode"] === "IR-REMOVE") {
                            const values = value.split(' ');

                        }
                        break;*/ // TODO
                }
            } catch (e) {
                console.error(e);
            }
            
            this.elem.innerHTML = translated;
        } else {
            this.elem.textContent = "<None>";
        }
        return super.set(value);
    }
}



// ========================
// ATTRIBUTE SETTERS

/**
 * Instances of this class are responsible for setting a single attribute value to the server, once it has been changed by the user.
 */
class AttributeSender {
    /**
     * @param device - The device this attribute belongs to.
     * @param name - The name of this attribute.
     * @param inputElem - HTML input element which represents this attribute.
     */
    constructor(device, name, inputElem) {
        this.device = device;
        this.name = name;
        this.inputElem = inputElem;
    }

    /**
     * Get the current attribute value set by the user.
     */
    getValue() {
        throw new Error("This method should be overridden");
    }

    setDisabled(disabled) {
        this.inputElem.disabled = disabled;
    }
}

/**
 * AttributeSenders that inherit from this class send the new value immediately to the server, in contrast to
 * {@link AttributeSenderOnButton}.
 */
class NormalAttributeSender extends AttributeSender {
    /**
     * @param device - See {@link AttributeSender#constructor}
     * @param name - See {@link AttributeSender#constructor}
     * @param inputElem - See {@link AttributeSender#constructor}
     * @param event - Name of the event that is fired on {@code inputElement} once the value has been changed.
     */
    constructor(device, name, inputElem, event) {
        super(device, name, inputElem);
        this.inputElem.addEventListener(event, () => this.device.onUpdateValue(this.name, this.getValue()));
    }
}

/**
 * Used for sending the value of an <input> tag.
 */
class InputAttributeSender extends NormalAttributeSender {
    constructor(device, name, inputElem) {
        super(device, name, inputElem, "input");
    }

    getValue() {
        return this.inputElem.value;
    }
}

/**
 * Used for sending the value of an <select> tag.
 */
class SelectAttributeSender extends NormalAttributeSender {
    constructor(device, name, inputElem) {
        super(device, name, inputElem, "change");
    }

    getValue() {
        return this.inputElem.options[this.inputElem.selectedIndex].text;
    }
}

/**
 * AttributeSenders that inherit from this class send the new value to the server once the user has clicked on a button,
 * in contrast to {@link NormalAttributeSender}.
 */
class AttributeSenderOnButton extends AttributeSender {
    constructor(device, name, inputElem, buttonElem) {
        super(device, name, inputElem);
        this.buttonElem = buttonElem;
        this.buttonElem.addEventListener("click", () => this.device.onUpdateValue(this.name, this.getValue()));
    }

    setDisabled(disabled) {
        super.setDisabled(disabled);
        this.buttonElem.disabled = disabled;
    }
}

/**
 * Used for sending the value of an <input> tag once the user has clicked on a button.
 */
class InputAttributeSenderOnButton extends AttributeSenderOnButton {
    getValue() {
        return this.inputElem.value;
    }
}

/**
 * Used for sending the value of an <input> tag once the user has clicked on a button.
 */
class SelectAttributeSenderOnButton extends AttributeSenderOnButton {
    getValue() {
        return this.inputElem.options[this.inputElem.selectedIndex].text;
    }
}


window.onload = () => {
    // ====================
    // CONSTANTS
    const TEMPLATES = {
        [SensorDevice.getDeviceType()]: document.getElementById("sensor-template"),
        [MotorDevice.getDeviceType()]: document.getElementById("motor-template"),
        [LedDevice.getDeviceType()]: document.getElementById("led-template")
    }
    const CONTAINERS = {
        [SensorDevice.getDeviceType()]: document.getElementById("sensors-container"),
        [MotorDevice.getDeviceType()]: document.getElementById("motors-container"),
        [LedDevice.getDeviceType()]: document.getElementById("leds-container")
    }

    const ALERT_WEBSOCKET_CLOSED = document.getElementById("alert-websocket-closed");

    const PORTS = [
        [SensorDevice.getDeviceType(), "ev3-ports:in1", "1"],
        [SensorDevice.getDeviceType(), "ev3-ports:in2", "2"],
        [SensorDevice.getDeviceType(), "ev3-ports:in3", "3"],
        [SensorDevice.getDeviceType(), "ev3-ports:in4", "4"],

        [MotorDevice.getDeviceType(), "ev3-ports:outA", "A"],
        [MotorDevice.getDeviceType(), "ev3-ports:outB", "B"],
        [MotorDevice.getDeviceType(), "ev3-ports:outC", "C"],
        [MotorDevice.getDeviceType(), "ev3-ports:outD", "D"],

        [LedDevice.getDeviceType(), "led:LEFT", "left"],
        [LedDevice.getDeviceType(), "led:RIGHT", "right"]
    ];
    const DEVICES = {
        [SensorDevice.getDeviceType()]: SensorDevice,
        [MotorDevice.getDeviceType()]: MotorDevice,
        [LedDevice.getDeviceType()]: LedDevice
    }

    /** @type {Object.<string, Device>} Maps port names to devices.  */
    const devices = {};


    // ====================
    // WEBSOCKET CONNECTION
    /** @type {(WebSocket|null)} */
    let ws = null;

    try {
        ws = new WebSocket("ws://" + window.location.hostname + ":8000/ev3-info");
    } catch (error) {
        console.error(error);
        ALERT_WEBSOCKET_CLOSED.hidden = false;
    }

    // contains all messages that should be sent to the server and that can not be "overridden" by newer events (e.g. sending a command cannot be overridden, but changing LED brightness can)
    let nonOverridableWebSocketMessages = [];
    // contains all messages that should be sent to the server and that can be "overridden" by newer events
    let overridableWebSocketMessages = {};
    let hasReceivedNext = false;

    if (ws != null) {
        ws.addEventListener("open", event => console.log("websocket opened", event));
        ws.addEventListener("close", event => {
            console.log("WebSocket closed", event);
            ALERT_WEBSOCKET_CLOSED.hidden = false;
        });
        ws.addEventListener("message", event => {
            if (event.data === "next") {
                hasReceivedNext = false;
                // server sends "next" to tell client that client can now send updates because the server is finished processing updates
                let messages = [];
                messages.push(...nonOverridableWebSocketMessages);
                messages.push(...Object.values(overridableWebSocketMessages));
                nonOverridableWebSocketMessages = [];
                overridableWebSocketMessages = {};
                if (messages.length === 0) {
                    // there are currently no messages to send
                    hasReceivedNext = true;
                } else {
                    ws.send(JSON.stringify(messages));
                }
            } else {
                const data = JSON.parse(event.data);
                // server sends data in this format:
                // {
                //  "disconnected_devices": [<list of ports whose devices have been disconnected>],
                //  "<port1>": {<new values for device on port 'port1'>},
                //  "<port2>": {<new values for device on port 'port2'>},
                //  ...
                // }
                for (let [port, deviceData] of Object.entries(data)) {
                    if (port === "disconnected_devices") {
                        for (let disconnectedPort of deviceData) {
                            console.log("Device disconnected", disconnectedPort);
                            devices[disconnectedPort].onDeviceDisconnected();
                        }
                    } else {
                        devices[port].updateValues(deviceData);
                    }
                }
            }
        });
    }

    /**
     * @param {Object} message - Message to send to the server.
     * @param {(String|null)} identification - If null, specifies that this message is non-overridable and should be sent to the server. 
     *                                         If identification is specified, a previous message with the same identification is replaced by the new message and only the new message is sent to the server.
     */
    function sendToServer(message, identification = null) {
        if (identification == null) {
            nonOverridableWebSocketMessages.push(message);
        } else {
            overridableWebSocketMessages[identification] = message;
        }
        if (hasReceivedNext) {
            // client can send messages directly
            hasReceivedNext = false;
            let messages = [];
            messages.push(...nonOverridableWebSocketMessages);
            messages.push(...Object.values(overridableWebSocketMessages));
            nonOverridableWebSocketMessages = [];
            overridableWebSocketMessages = {};
            ws.send(JSON.stringify(messages));
        }
    }


    // ====================
    // INITIALIZATION OF DEVICES
    for (let [deviceType, port, portName] of PORTS) {
        const newCard = TEMPLATES[deviceType].content.firstElementChild.cloneNode(true);
        devices[port] = new DEVICES[deviceType](sendToServer, port, portName, newCard);
        CONTAINERS[deviceType].appendChild(newCard);
    }


    // ====================
    // STEERING WITH JOYSTICK
    const joystickLeftPortInput = document.getElementById("joystick-left-port");
    const joystickRightPortInput = document.getElementById("joystick-right-port");
    const joystickSensitivityInput = document.getElementById("joystick-sensitivity");
    let joystickSensitivity = joystickSensitivityInput.value;
    joystickSensitivityInput.addEventListener("change", () => joystickSensitivity = joystickSensitivityInput.value);

    const circle = document.getElementById("large-steering-circle");
    const joystick = document.getElementById("joystick-steering-circle");
    let circleRadius = 250;  // circle radius to calculate joystick position
    let circleRadiusSmaller = 250;  // circle radius the position of the joystick is clamped to

    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    function dragStart(event) {
        isDragging = true;
        setPosition(event);
    }
    function drag(event) {
        if (isDragging) {
            event.preventDefault();
            setPosition(event);
        }
    }
    function setPosition(event) {
        if (event.type === "touchmove" || event.type === "touchstart") {
            const rect = circle.getBoundingClientRect();
            currentX = event.touches[0].clientX - rect.left - circleRadius;
            currentY = event.touches[0].clientY - rect.top - circleRadius;
        } else {
            currentX = event.offsetX - circleRadius;
            currentY = event.offsetY - circleRadius;
        }
        if (Math.abs(currentX) < circleRadius / 10) {
            currentX = 0;
        }
        if (Math.abs(currentY) < circleRadius / 20) {
            currentY = 0;
        }
        // clamp currentX/Y to outer circle
        const distance = Math.sqrt(currentX * currentX + currentY * currentY);
        if (distance > circleRadiusSmaller) {
            currentX = currentX / (distance / circleRadiusSmaller);
            currentY = currentY / (distance / circleRadiusSmaller);
        }
        setJoystickPosition();
    }
    function dragEnd(event) {
        isDragging = false;
        currentX = 0;
        currentY = 0;
        setJoystickPosition();
    }
    function setJoystickPosition() {
        joystick.style.transform = "translate(" + currentX + "px," + currentY + "px)";
        sendToServer({ type: "rc-joystick", x: currentX / circleRadius * joystickSensitivity, y: -currentY / circleRadius * joystickSensitivity, leftPort: joystickLeftPortInput.options[joystickLeftPortInput.selectedIndex].value, rightPort: joystickRightPortInput.options[joystickRightPortInput.selectedIndex].value },
                "rc-joystick");
    }
    
    function resize() {
        circleRadius = circle.clientHeight / 2;
        circleRadiusSmaller = circle.clientHeight / 2.1;
        // resize joystick
        const radius = Math.sqrt(circle.clientHeight)*2.23606797749979;
        joystick.style.width = radius + "px";
        joystick.style.height = radius + "px";
        joystick.style.marginTop = "calc(50% - " + radius / 2 + "px)";
    }
    resize();
    window.addEventListener("resize", resize);

    circle.addEventListener("mousedown", dragStart, false);
    circle.addEventListener("touchstart", dragStart, false);
    circle.addEventListener("mousemove", drag, false);
    circle.addEventListener("touchmove", drag, false);
    circle.addEventListener("mouseup", dragEnd, false);
    circle.addEventListener("touchend", dragEnd, false);
    circle.addEventListener("touchcancel", dragEnd, false);


    // STEERING WITH TWO MOTORS
    for (let i = 1; i < 3; i++) {
        const portInput = document.getElementById("steering-port-" + i);
        const speedInput = document.getElementById("steering-speed-" + i);
        let isDragging = false;
        function sendSpeed() {
            console.log("speed", speedInput.value);
            sendToServer({ type: "rc-motor", speed: parseFloat(speedInput.value), port: portInput.options[portInput.selectedIndex].value }, "rc-motor-" + i);
        }
        speedInput.addEventListener("input", () => {
            // called whenever user changes the value
            isDragging = true;
            sendSpeed();
        });
        speedInput.addEventListener("change", () => {
            // called whenever user releases slider
            isDragging = false;
        });
        setInterval(() => {
            if (!isDragging && speedInput.value != 0) {
                // move slider back to center
                let value = speedInput.value / (Math.abs(speedInput.value) / (Math.abs(speedInput.value) - 0.01));
                if (Math.abs(value) < 0.01)
                    value = 0;
                speedInput.value = value;
                sendSpeed();
            }
        }, 10);
    }
};
