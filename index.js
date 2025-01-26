import puppeteer from "puppeteer-core";
import fs from "fs"
import dotenv from "dotenv";
import { spawn } from "node:child_process";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os'
import { skip } from "node:test";


const envOs = os.platform === "win32"? "windows":"linux"

const filename = fileURLToPath(import.meta.url)
const dirpath = dirname(filename)

dotenv.config({path:`${dirpath}/.env`})

const arg = process.argv

const flags  = {
    checkAssignment:0,
    renewMapel:0,
    absen:0,
    absenTarget:0,
    debug:0,
    assignmentRaw:0,
    matkulsRaw:0,
    matkulList:0,
    checkNotif:0
}

const arrayMatkul = (await readMatkulJSON()).map((el)=>el.matakuliah.nama)

async function setUser(name,pass){
    try{
        const encodedpass = btoa(pass)
        const encryptedpass = encodedpass//.slice(0,encodedpass.length )
        fs.writeFileSync(`${dirpath}/.env`, `USERNAME=${name}\nPASSWORD=${encryptedpass}`)
        console.log("Config Updated Successfully")
    }
    catch(err){
        console.log(err)
    }
}

async function getBinaryPath(){
    return new Promise((resolve,reject)=>{
        let command;
        let path = ""
        if(envOs === "windows"){
            command = spawn("where", ["chrome.exe"])
        }
        else {
            command = spawn("which", ["google-chrome-stable"])
        }
        command.stdout.on('data',data =>{
            path += data.toString().trim()
        })
        command.stderr.on('data',data=>{
            console.log("Error finding binary file\nExiting Now...")
        })
        command.on("close",code=>{
            if(code === 0){
                resolve(path)
            } else{
                reject(0)
            }
        })
    })
}

async function readMatkulJSON (){
        const file = await fs.readFileSync(`${dirpath}/matkulDetail.json`, 'utf8')
        return JSON.parse(file);
}
    
async function sleep(time){
    return new Promise((resolve) =>{
        setTimeout(()=>{
            resolve();
        },time);
    })
}

async function checkNew(output){
    return new Promise((resolve)=>{
        fs.readFile(`${dirpath}/output.json`, 'utf-8', (err, data) =>{
            if (err) {
                console.error(err)
                resolve(2)
            } 
            if(data === JSON.stringify(output, null, 2)){
                resolve(0)
            }
            else resolve(1)
        })
    })
}
async function RenewMapel(response){
    try{
        const responUrl = await response.request().url()
        const urlRegex = /[?&]tahun=\d+&semester=\d+/
        if(urlRegex.test(responUrl)){
            //console.log(responUrl[responUrl.length - 1])
            const body = await response.json()
            await fs.writeFileSync(`${dirpath}/matkulDetail.json`, JSON.stringify(body,null,2))
            console.log("Renewed Successfully")
            await importMatkul()
        }
        
        
    } catch(err){
        console.error(err)
    }
}


async function importMatkul(){
    try{
        // if(!fs.existsSync(`${dirpath}/matkulDetail.json`)){
        //     fs.writeFileSync(`${dirpath}/matkulDetail.json`,"[]")
        // }
        const file = await fs.readFileSync(`${dirpath}/matkulDetail.json`,'utf8')
        const matkulData = JSON.parse(file)
        for (let i = 0;i<matkulData.length;i++){
            console.log(`${i+1}. Matkul: ${matkulData[i].matakuliah.nama.padEnd(35)} | Pembimbing: ${matkulData[i].dosen}`)
        }
    }
    catch(err){
        console.error(err)
    }
}

async function Absen(page){
    const matkulNum = flags.absenTarget
    const matkulCard = await page.$(`div[data-name="${arrayMatkul[matkulNum]}"]`);
    //console.log(matkulCard)
    const matkulBtn = await matkulCard.$("button.text-none.v-btn.v-btn--text.theme--light.v-size--default.primary--text")
    //console.log(matkulBtn)
    await matkulBtn.click()
    await sleep(1000)
    const presensiDiv = await page.$("div.col-md-7.col-12")
    const presensiBtn = await presensiDiv.$("button")
    const isDisabled = await presensiBtn.evaluate(el => el.getAttribute("disabled"))
    if (isDisabled === "disabled"){
        console.log(`Presensi for ${arrayMatkul[matkulNum]} is not yet available`)
    }
    else {
        await presensiBtn.click();
        console.log("Presensi Success")
    }

}
async function listMatkul(){
    const file = await fs.readFileSync(`${dirpath}/matkulDetail.json`,'utf8')
    const raw = JSON.parse(file)
    if(flags.matkulsRaw){
        console.log(raw)
    }
    else{
        for(let i = 0;i<raw.length;i++){
            console.log(`${i+1}. Matkul: ${raw[i].matakuliah.nama.padEnd(35)} | Pembimbing: ${raw[i].dosen}`)
        }
    }
}
async function checkNewAssignment(response){
    const requestUrl = await response.request().url()
    if(requestUrl === "https://ethol.pens.ac.id/api/tugas/tugas-terakhir-mahasiswa"){
        try{
            const responseBody = await response.json();
           
                
                const status = await checkNew(responseBody);
                fs.writeFileSync(`${dirpath}/output.json`, JSON.stringify(responseBody, null, 2))
                switch (status){
                    case 0:
                        console.log("No New Assignment");
                        if(flags.assignmentRaw){
                            console.log(responseBody)
                            break;
                        }
                        const file0 = await fs.readFileSync(`${dirpath}/output.json`, 'utf8')
                        const outputjson0 = JSON.parse(file0)
                        for(let i = 0; i < outputjson0.length;i++){
                            console.log(`${i+1}. ${outputjson0[i].title}\n   Deadline:${outputjson0[i].deadline}`)
                        }
                        break;
                    case 1:
                        console.log("New Assignment Avaible");
                        if(flags.assignmentRaw){
                            console.log(responseBody)
                            break;
                        }
                        const file1 = await fs.readFileSync(`${dirpath}/output.json`, 'utf8')
                        const outputjson1 = JSON.parse(file1)
                        for(let i = 0; i < outputjson1.length;i++){
                            console.log(`${i+1}. ${outputjson1[i].title}\n   Deadline:${outputjson1[i].deadline}`)
                        }
                        break;
                    case 2:
                        console.log("Error on checking file");
                        break;
                
                //console.log(responseBody);
            }
        }
        catch(err){
        
        }
    }   
}
async function checkNewNotification(response){
    const responseUrl = await response.request().url()
    try{
        if (responseUrl === "https://ethol.pens.ac.id/api/notifikasi/mahasiswa?filterNotif=TUGAS"){
            const body = await response.json()
            if(!fs.existsSync(`${dirpath}/notiflog.json`)){
                await fs.writeFileSync(`${dirpath}/notiflog.json`,JSON.stringify(body,null,2))
                console.log("Log Created");
            } 
            else {
                const prevFile = await fs.readFileSync(`${dirpath}/notiflog.json`,'utf8')
                const prevLog = await JSON.parse(prevFile)
                const prevLength = prevLog.length
                const curLemgth = body.length
                
                if(prevLength<curLemgth){
                    await fs.writeFileSync(`${dirpath}/notiflog.json`, JSON.stringify(body,null,2))
                    const notifNum = curLemgth - prevLength
                    //const newNotif = body.slice(curLemgth-(prevLength+1))
                    console.log(`${notifNum} New Notification\n`)
                    for(let i = 0;i<notifNum;i++ ){
                        console.log(`${i+1} ${body[i].kodeNotifikasi}\n    Keterangan:${body[i].keterangan}\n`)
                    }
                }
                else{
                    console.log("No New Notification Available")
                }
            }
    
        }
    }
    catch(err){
        console.log(err)
    }
}

async function EtholHook(){

    if(!flags.absen && !flags.checkAssignment && !flags.renewMapel && !flags.checkNotif) {
        if (flags.matkulList) listMatkul();
        return;
    }
    if (flags.matkulList) listMatkul();
    if(!process.env.USERNAME || !process.env.PASSWORD){
        console.log("No profile found, run with --config to set profile")
        process.exit(1);
    }
    const username = process.env.USERNAME
    const password = atob(process.env.PASSWORD)


    const path = await getBinaryPath();
    if(!path){
        console.log("exiting now...");
        process.exit(1);
    }
    
    const browser = await puppeteer.launch({
        executablePath:path,
        headless:flags.debug? false:true
    });
    try{
        const page = await browser.newPage();

        await page.goto("https://ethol.pens.ac.id/");
        if (flags.checkAssignment || flags.renewMapel || flags.checkNotif){
            page.on('response', async response => {

                if(response.request().method().toUpperCase() != "OPTION"){
                    if(flags.checkAssignment){
                    await checkNewAssignment(response)
                    }
                    if (flags.renewMapel){
                        await RenewMapel(response)
                    }
                    if(flags.checkNotif){
                        await checkNewNotification(response)
                    }
                }
                    
                
            });
        }

        await page.locator("span").filter(button=>button.innerText = "LOGIN").click();

        await page.locator("div.row.ethol-card-login-option").wait()
        await page.locator("div.row.ethol-card-login-option").click();

        await sleep(1000);
        await page.locator("input#username").fill(username);
        await page.locator("input#password").fill(password);
        await page.locator("input.btn-submit").click();
        
        await sleep(3000)
        if(!flags.absen){
            throw new Error("0")
        }
        await page.reload();
        await sleep(2000)

        
        if (flags.absen){
            await Absen(page)
        }

    }
    catch(err){
        if(err.message !== '0'){
            console.log(err)
        }
    } finally{
        await browser.close();
    }
}

async function readArg(){
    for(let i = 2;i<arg.length;i++){
        switch (arg[i]){
            case "-t":
                flags.checkAssignment = 1;
                if (arg[i+1] === "-raw" ){
                    flags.assignmentRaw = 1;
                    i++;
                }
                break;
            case "-r":
                flags.renewMapel = 1;
                break;
            case "-a":
                flags.absen = 1;
                i++;
                const matkuls = readMatkulJSON();
                flags.absenTarget = arg[i];
                break;
            case "-d":
                flags.debug = 1;
                break
            case "-l":
                flags.matkulList = 1;
                if (arg[i+1] === "-raw"){
                    flags.matkulsRaw = 1
                    i++
                }
                break;
            case "-n":
                flags.checkNotif = 1;
                break;
            case "--config":
                setUser(arg[i+1],arg[i+2])
                break

        }
    }
}

(async function main(){
    if(arg[2] === "--help"){
        console.log("arg:\n  -t             Check Assignment\n  -t -raw        Output raw data of Assignment\n  -r             Update Matkuls (semester update)\n  -a {matkul}    Fill Precency in the given matkul\n  -d             Disable headless (for debugging)\n  -l             Show current matkuls\n  -l -raw        Show Matkuls information\nRun with -r to update matkulDetail.json file\n  -n             Check New Notification\n  --config {username} {password} Set account to log into ethol");
        for (let i = 0;i<arrayMatkul.length;i++){
            console.log(`matkul ${i} = ${arrayMatkul[i]}`);
        }
        return;
    }   
    else if(arg.length > 2){
        readArg();
        EtholHook();
    }
    else {
        console.log("Usage - run with --help to see details")
    }

})()

