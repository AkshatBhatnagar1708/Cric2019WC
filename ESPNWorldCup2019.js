//https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results

let minimist = require("minimist");
let axios = require("axios");
let fs = require("fs");
let path = require("path");
let pdf = require("pdf-lib");
let excel = require("excel4node");
let args = minimist(process.argv);

let jsdom = require("jsdom");
const { ExceededMaxLengthError } = require("pdf-lib");
const { FORMERR } = require("dns");
let responseKaPromise = axios.get(args.source);
responseKaPromise.then(function(response){
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let matches = [];
    let matchdivs = document.querySelectorAll("div.match-score-block");
    for(let i =0;i<matchdivs.length;i++){
        let matchdiv = matchdivs[i];
        let match = {
        t1 : "", 
        t2 : "",
        t1s : "",
        t2s : "",
        result : ""
        };
        
        let teamParas = matchdiv.querySelectorAll("div.name-detail > p.name");
        match.t1 = teamParas[0].textContent;
        match.t2 = teamParas[1].textContent;
        
        let scoreSpans = matchdiv.querySelectorAll("div.score-detail > span.score")
        
        
        if(scoreSpans.length == 2){
          match.t1s = scoreSpans[0].textContent;
          match.t2s = scoreSpans[1].textContent;
        }else if(scoreSpans.length == 1){
          match.t1s = scoreSpans[0].textContent;
          match.t2s = "";
        }else{
          match.t1s = "";
          match.t2s = "";
        }


        let resultSpan = matchdiv.querySelector("div.status-text>span");
        match.result = resultSpan.textContent;
 
        matches.push(match);
    }
  
    let matchesJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json",matchesJSON,"utf-8");  
    
  let teams = [];
  for(let i =0;i<matches.length;i++){
    putTeaminTeamsArrayIfMissing(teams,matches[i]);
   
    
  }
  for(let i =0;i<matches.length;i++){
  putMatchInAppropriateTeam(teams,matches[i]);
  
  }
  let teamsJSON = JSON.stringify(teams);
  fs.writeFileSync("teams.json",teamsJSON,"utf-8");
  
  createFileExcel(teams); 
  createFolders(teams);

})

function createFolders(teams){
fs.mkdirSync(args.dataFolder);
for(let i =0;i<teams.length;i++){
  let teamFN = path.join(args.dataFolder,teams[i].name);
  fs.mkdirSync(teamFN);

  for(let j =0; j<teams[i].matches.length;j++){
    let matchFileName = path.join(teamFN,teams[i].matches[j].vs + ".pdf");
    createScoreCard(teams[i].name,teams[i].matches[j],matchFileName);
  }
}
}

function createScoreCard(teamName,match,matchFileName){
let t1 = teamName;
let t2 = match.vs;
let t1s = match.selfScore;
let t2s = match.oppScore;
let result = match.result;

let bytesOfPDFTemplate = fs.readFileSync("WorldCup 2019-converted.pdf");
let pdfdocKaPromise = pdf.PDFDocument.load(bytesOfPDFTemplate);
pdfdocKaPromise.then(function(pdfdoc){
  let page = pdfdoc.getPage(0);

  page.drawText(t1,{
  x : 320,
  y: 650,
  size : 20
  });
  page.drawText(t2,{
    x : 320,
    y: 610,
    size : 20
    });
  page.drawText(t1s,{
      x : 320,
      y: 570,
      size : 20
   });
  page.drawText(t2s,{
        x : 320,
        y:  532,
        size : 20
  });
  page.drawText(result,{
          x : 320,
          y: 499,
          size : 17
  });    



   let finalPDFBytesKaPromise = pdfdoc.save();
   finalPDFBytesKaPromise.then(function(finalPDFBytes){
     fs.writeFileSync(matchFileName,finalPDFBytes);
   })




})


}




function createFileExcel(teams){
  let wb = new excel.Workbook();
  for(let i =0;i<teams.length;i++){
    let sheet = wb.addWorksheet(teams[i].name);
    
    sheet.cell(2,1).string("VS");
    sheet.cell(2,2).string("Self Score");
    sheet.cell(2,3).string("OPP Score");
    sheet.cell(2,4).string("Result");

    for(let j = 0;j<teams[i].matches.length ;j++){
      sheet.cell(j+3,1).string(teams[i].matches[j].vs);
      sheet.cell(j+3,2).string(teams[i].matches[j].selfScore);
      sheet.cell(j+3,3).string(teams[i].matches[j].oppScore);
      sheet.cell(j+3,4).string(teams[i].matches[j].result);

    }
  }
  wb.write(args.excel);
}





function putTeaminTeamsArrayIfMissing(teams,match){
  let t1idx = -1;
  for(let i =0; i<teams.length;i++){
      if(teams[i].name == match.t1){
      t1idx = i;
      break;
      }
  }
  if(t1idx == -1){
    teams.push({
      name: match.t1,
      matches:[],
    });

  }

  let t2idx = -1;
  for(let i =0;i<teams.length;i++){
    if(teams[i].name == match.t2){
      t2idx = i;
      break;
    }
  }
  if(t2idx ==-1){
    teams.push({
      name : match.t2,
      matches:[],
    });
    
  }


}

function putMatchInAppropriateTeam(teams,match){
  let t1idx = -1;
  for(let i =0; i<teams.length;i++){
      if(teams[i].name == match.t1){
      t1idx = i;
      break;
      }
  }
  let team1 = teams[t1idx];
  team1.matches.push({
    vs:match.t2,
    selfScore : match.t1s,
    oppScore: match.t2s,
    result : match.result
  });
  
  let t2idx = -1;
  for(let i =0; i<teams.length;i++){
      if(teams[i].name == match.t2){
      t2idx = i;
      break;
      }
  }
  let team2 = teams[t2idx];
  team2.matches.push({
    vs:match.t1,
    selfScore : match.t2s,
    oppScore: match.t1s,
    result : match.result
  });


}
