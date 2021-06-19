"use strict";
// Heart Beat File
// To let Azure App Service we have started
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HearBeat = void 0;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const HearBeat = () => {
    const app = express_1.default();
    const port = process.env.PORT || 3030;
    app.use(express_1.default.static(path_1.default.join('public')));
    // app.get('/', (req, res) => {
    //   res.send(`
    //     <center><h2>Welcome to Sk Bot !!!<h2></center> ${__dirname}
    //     `);
    //   // res.sendFile(path.join(__dirname,'static','index.html'));
    // });
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`);
    });
};
exports.HearBeat = HearBeat;
