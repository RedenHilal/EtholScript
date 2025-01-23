import puppeteer from "puppeteer-core";
import fs from "fs"
import dotenv from "dotenv";
import { spawn } from "node:child_process";
import { argv } from "node:process";

const wd = "/home/Yurneth/Documents/projects/etholhook"

dotenv.config({path:`${wd}/.env`})
const username = process.env.USERNAME
const password = process.env.PASSWORD

const arrayMatkul = [
    "Dasar Sistem Komputer", 
    "Logika dan Algoritma", 
    "Konsep Pemrograman", 
    "Pancasila", 
    "Matematika 1", 
    "Konsep Teknologi Informasi", 
    "Praktikum Konsep Pemrograman", 
    "Workshop Desain Web", 
    "Keterampilan Nonteknis", 
    "Agama"
    ]
    

const arg = process.argv

async function sleep(time){
    return new Promise((resolve) =>{
        setTimeout(()=>{
            resolve();
        },time);
    })
}

async function checkNew(output){
    return new Promise((resolve)=>{
        fs.readFile(`${wd}/output.json`, 'utf-8', (err, data) =>{
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
async function RenewMapel(page){
    const elements = await page.$$("div.ethol-matkul-slider");
    console.log("[")
    for (const element of elements){
        const attribute = await element.evaluate(el => el.getAttribute('data-name'))
        console.log(attribute )
    }
}

async function Absen(page, matkulNum){
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

async function EtholHook(num){
    
    const browser = await puppeteer.launch({
        executablePath:"/usr/bin/google-chrome-stable",
        headless:true
    });
    try{
        const page = await browser.newPage();

        await page.goto("https://ethol.pens.ac.id/");
        if (num==1){
            page.on('response', async response => {
        
                const responseStatus = response.status();
                const requestMethod = response.request().method();

                if (requestMethod == "POST" )
                
                    if(responseStatus >= 200 && responseStatus <300){
                        try{
                            const responseBody = await response.json();
                            if("nomor_tugas_mahasiswa" in responseBody[0]){
                                
                                const status = await checkNew(responseBody);
                                fs.writeFileSync(`${wd}/output.json`, JSON.stringify(responseBody, null, 2))

                                switch (status){
                                    case 0:
                                        console.log("No New Assignment");
                                        if(arg.length === 4 && arg[3] === "-raw"){
                                            console.log(responseBody)
                                            break;
                                        }
                                        const command1 = spawn("jq", [".[] | {title, deadline}", `${wd}/output.json`])
                                        command1.stdout.on('data', data=>{
                                            const jqOutput = data.toString();
                                            console.log(jqOutput);
                                        })
                                        break;
                                    case 1:
                                        console.log("New Assignment Avaible");
                                        if(arg.length === 4 && arg[3] === "-raw"){
                                            console.log(responseBody)
                                            break;
                                        }
                                        const command = spawn("jq", [".[] | {title, deadline}", `${wd}/output.json`])
                                        command.stdout.on('data', data=>{
                                            const jqOutput = data.toString();
                                            console.log(jqOutput);
                                        })
                                        break;
                                    case 2:
                                        console.log("Error on checking file");
                                        break;
                                }

                                //console.log(responseBody);
                            }
                        }
                        catch(err){
                        
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
        
        await sleep(2000);
        await page.reload();
        await sleep(3000);

        if (num===2){
            await RenewMapel(page)
        }
        
        if (num === 3){
            await Absen(page, arg[3])
        }

        // page.on("response", async (response)=>{
        //     console.log(await response.json());
        // })



    }
    catch(err){
        console.log(err)
    } finally{
        await browser.close();
    }
}

(async function main(){
    if(arg[2] === "--help"){
        console.log("arg:\n  -t     Check Assignment\n-t -raw       Output raw data of Assignment\n  -r     Get Current Matkuls\n  -a {matkul}    Fill Precency in the given matkul");
        for (let i = 0;i<arrayMatkul.length;i++){
            console.log(`matkul ${i} = ${arrayMatkul[i]}`);
        }
    }   
    else if(arg[2] === "-t"){
        EtholHook(1)
    }
    else if(arg[2] === "-r"){
        EtholHook(2)
    }
    else if(arg[2] === "-a"){
        EtholHook(3)
    }
    else {
        console.log("Usage - run with --help to see details")
    }

})()

