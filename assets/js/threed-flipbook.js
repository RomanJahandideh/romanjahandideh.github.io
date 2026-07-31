!function(){"use strict";var started=false;
var TOC=[
  {title:"Photography",start:6,end:13,desc:"A visual diary shot through a designer's eye — composition, light, and negative space handled with the same rigor as a brand campaign, turning street scenes and quiet interiors into studies of contrast and mood."},
  {title:"Bosom (Sculpture)",start:14,end:14,desc:"Winner of a Tabriz sculpture competition on the theme of family. A single gesture — a father's protective grip on his son — carved to carry a whole narrative about instinct and tradition."},
  {title:"Zangar Museum",start:15,end:30,desc:"A conceptual museum whose faceted, folded form doubles as large-scale visual identity for the institution it represents — ranked 1st among the graduating class's dissertation projects."},
  {title:"Architecture School",start:31,end:41,desc:"A campus identity told through form: deconstructivist volumes layered over Qajar-era Iranian motifs, with Islamic geometric patterns doing double duty as facade ornament and interior lighting design."},
  {title:"Pilgrimages Airport",start:42,end:50,desc:"Wayfinding at the scale of a building — an Islamic-geometry algorithm generates the airport's form, giving pilgrims a single, instantly legible visual language from tarmac to terminal."},
  {title:"Rose Residential",start:51,end:60,desc:"A residential brand expressed in pattern and performance: a mashrabiya-inspired lattice facade cuts solar heat and cools passively while giving the building a signature, ownable look."},
  {title:"Rumi Museum",start:61,end:68,desc:"A spatial identity built around motion — the museum's rotational form choreographs visitors along the same dark-to-light path central to Sufi philosophy, turning Rumi's poetry into architecture."},
  {title:"Kitchen Design",start:69,end:75,desc:"Interior renders styled like product photography — material, light, and framing composed to sell a mood as much as a room."},
  {title:"Home Design",start:76,end:80,desc:"Full-home interior visualizations treated as lifestyle campaigns, each render composed to tell a story about how a space is lived in, not just how it's built."},
  {title:"Chairs Story",start:81,end:83,desc:"An abstract render series treating furniture as sculpture — chair forms caught mid-motion, inspired by the whirling of Molana's Sama dance."},
  {title:"Hedayat School",start:84,end:90,desc:"Brand-grade documentation of a real, built project: a late-Qajar-era house in Urmia archived as it moved from private residence to school across three generations of ownership."},
  {title:"Green Wall",start:91,end:97,desc:"A modular planter-and-furniture system where sustainability becomes the visual identity — greenery designed into the object itself rather than added on afterward."},
  {title:"Temporary Residence vs. Disasters",start:98,end:103,desc:"A competition-winning emergency housing concept designed to deploy fast after natural disasters — proof good design can move as quickly as the crisis it answers."},
  {title:"Abstract Photo of City",start:104,end:106,desc:"“The Ghost of Playground,” a 2018 award-winning abstract cityscape — the same compositional eye behind every project in this portfolio, applied to a single frame."},
  {title:"Rain Gardens on Büyükada",start:107,end:132,desc:"A landscape research project turned visual system: rain gardens and green infrastructure mapped, diagrammed, and branded as one cohesive strategy for stormwater and carbon management on Büyükada island, Istanbul."}
];
function findProject(pageNum){
  for(var i=0;i<TOC.length;i++){
    if(pageNum>=TOC[i].start&&pageNum<=TOC[i].end)return TOC[i];
  }
  return null;
}
function init(){
  if(started)return;
  var mount=document.getElementById("threed-flipbook");
  if(!mount||!window.pdfjsLib)return;
  var PageFlipCtor=(window.St&&window.St.PageFlip)||window.PageFlip;
  if(!PageFlipCtor)return;
  started=true;
  pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  var src=mount.getAttribute("data-pdf-src");
  var wrap=mount.parentElement;
  var win=document.getElementById("threed-window");

  var counterEl=document.createElement("div");
  counterEl.className="threed-page-counter";
  win.appendChild(counterEl);

  var navEl=document.createElement("div");
  navEl.className="threed-project-nav";
  wrap.appendChild(navEl);
  var pills=TOC.map(function(project){
    var pill=document.createElement("button");
    pill.type="button";
    pill.className="threed-project-pill";
    pill.textContent=project.title;
    pill.addEventListener("click",function(){jumpToProject(project)});
    navEl.appendChild(pill);
    return pill;
  });

  var stage=document.createElement("div");
  stage.className="threed-flip-stage";
  wrap.appendChild(stage);
  var prevBtn=document.createElement("button");
  prevBtn.type="button";
  prevBtn.className="threed-flip-arrow threed-flip-prev";
  prevBtn.setAttribute("aria-label","Previous page");
  prevBtn.innerHTML="&#8249;";
  stage.appendChild(prevBtn);
  stage.appendChild(mount);
  var nextBtn=document.createElement("button");
  nextBtn.type="button";
  nextBtn.className="threed-flip-arrow threed-flip-next";
  nextBtn.setAttribute("aria-label","Next page");
  nextBtn.innerHTML="&#8250;";
  stage.appendChild(nextBtn);
  mount.classList.add("threed-flip-book");

  var infoEl=document.createElement("div");
  infoEl.className="threed-project-info";
  infoEl.innerHTML='<div class="threed-project-info-title"></div><div class="threed-project-info-desc"></div>';
  wrap.appendChild(infoEl);
  var titleEl=infoEl.querySelector(".threed-project-info-title");
  var descEl=infoEl.querySelector(".threed-project-info-desc");

  var flip=null;
  function jumpToProject(project){
    if(flip)flip.turnToPage(project.start-1);
  }

  pdfjsLib.getDocument(src).promise.then(function(pdf){
    return pdf.getPage(1).then(function(firstPage){
      var vp=firstPage.getViewport({scale:1});
      var aspect=vp.width/vp.height;
      var availRect=stage.getBoundingClientRect();
      var availW=availRect.width,availH=availRect.height;
      var doubleUp=availW>500;
      var contentAspect=doubleUp?aspect*2:aspect;
      var fitW=availW,fitH=fitW/contentAspect;
      if(fitH>availH){fitH=availH;fitW=fitH*contentAspect}
      stage.style.flex="0 0 auto";
      stage.style.width=Math.round(fitW)+"px";
      stage.style.height=Math.round(fitH)+"px";
      stage.style.margin="auto";
      var pageH=Math.round(fitH),pageW=Math.round(doubleUp?fitW/2:fitW);
      var pages=[];
      for(var i=1;i<=pdf.numPages;i++){
        var pageEl=document.createElement("div");
        pageEl.className="threed-page";
        pageEl.dataset.pageNum=String(i);
        pageEl.appendChild(document.createElement("canvas"));
        mount.appendChild(pageEl);
        pages.push(pageEl);
      }

      flip=new PageFlipCtor(mount,{
        width:pageW,height:pageH,size:"stretch",
        minWidth:150,maxWidth:2000,minHeight:200,maxHeight:2000,
        showCover:false,usePortrait:true,maxShadowOpacity:.5,
        mobileScrollSupport:true,useMouseEvents:true
      });
      flip.loadFromHTML(mount.querySelectorAll(".threed-page"));

      var rendered={};
      function renderPage(n){
        if(rendered[n]||n<1||n>pdf.numPages)return;
        rendered[n]=true;
        pdf.getPage(n).then(function(page){
          var canvas=pages[n-1].querySelector("canvas");
          var viewport=page.getViewport({scale:2});
          canvas.width=viewport.width;
          canvas.height=viewport.height;
          page.render({canvasContext:canvas.getContext("2d"),viewport:viewport});
        });
      }
      function renderAround(n){
        for(var d=-1;d<=3;d++)renderPage(n+d);
      }
      function updateInfo(){
        var n=flip.getCurrentPageIndex()+1;
        var project=findProject(n);
        counterEl.textContent="Page "+n+" / "+pdf.numPages;
        titleEl.textContent=project?project.title:"";
        descEl.textContent=project?project.desc:"";
        pills.forEach(function(pill,idx){
          pill.classList.toggle("is-active",project===TOC[idx]);
        });
      }

      renderAround(1);
      updateInfo();
      flip.on("flip",function(e){
        renderAround(e.data+1);
        updateInfo();
      });
      prevBtn.addEventListener("click",function(){flip.flipPrev()});
      nextBtn.addEventListener("click",function(){flip.flipNext()});
    });
  }).catch(function(err){
    mount.innerHTML='<p style="padding:24px;font-size:13px;color:rgba(28,25,23,.6)">Could not load the portfolio PDF.</p>';
    console.warn("3D Design flipbook failed to load:",err);
  });
}
window.addEventListener("portfolio:3ddesign-open",init);
}();
