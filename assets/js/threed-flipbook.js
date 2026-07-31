!function(){"use strict";var started=false;
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
  var stage=document.createElement("div");
  stage.className="threed-flip-stage";
  wrap.insertBefore(stage,mount);
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
  var statusEl=document.createElement("div");
  statusEl.className="threed-flip-status";
  statusEl.setAttribute("aria-live","polite");
  wrap.appendChild(statusEl);

  pdfjsLib.getDocument(src).promise.then(function(pdf){
    return pdf.getPage(1).then(function(firstPage){
      var vp=firstPage.getViewport({scale:1});
      var aspect=vp.width/vp.height;
      var pageH=560,pageW=Math.round(pageH*aspect);
      var pages=[];
      for(var i=1;i<=pdf.numPages;i++){
        var pageEl=document.createElement("div");
        pageEl.className="threed-page";
        pageEl.dataset.pageNum=String(i);
        pageEl.appendChild(document.createElement("canvas"));
        mount.appendChild(pageEl);
        pages.push(pageEl);
      }

      var flip=new PageFlipCtor(mount,{
        width:pageW,height:pageH,size:"stretch",
        minWidth:200,maxWidth:900,minHeight:280,maxHeight:1200,
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
      function updateStatus(){
        var n=flip.getCurrentPageIndex()+1;
        statusEl.textContent="Page "+n+" / "+pdf.numPages;
      }

      renderAround(1);
      updateStatus();
      flip.on("flip",function(e){
        renderAround(e.data+1);
        updateStatus();
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
