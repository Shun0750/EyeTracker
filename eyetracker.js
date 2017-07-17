var EyeTracker = function(){};
(function(){
  // 定数系
  EyeTracker.ViewMsec = 0;
  EyeTracker.DefaultViewMsec = 500;
  EyeTracker.FINGER_HEIGHT = 70;
  
  // 環境
  EyeTracker.Mode = "production"
  
  EyeTracker.TargetDivs = [];
  EyeTracker.Timer;
  EyeTracker.ViewRateArray = [];
  EyeTracker.ViewCountArray = [];
  EyeTracker.RankArray = [];
  EyeTracker.CurrentViewedElement;
  EyeTracker.CurrentViewedElementNum = 0;
  EyeTracker.CurrentConcentratedElementNum = 0;
  EyeTracker.CurrentViewedElementChanged = false;
  EyeTracker.MostViewedElements;
  EyeTracker.ViewAreaRate = [30,60];
  
  // ユーザー系
  EyeTracker.ViewSpeedArray = [];
  EyeTracker.ViewSpeedAverage = 0;
  EyeTracker.Interest = 0;
  
  // 状態系
  EyeTracker.TouchMoving = false;
  EyeTracker.Selector = "";
  EyeTracker.Running = false;

  // タッチ系
  EyeTracker.TouchY;
  EyeTracker.TouchX;
  EyeTracker.UpperSideHeight = 0;
  EyeTracker.LowerSideHeight = 0;
  EyeTracker.TouchedSideCount = [0,0];  
  EyeTracker.TouchedSide = "";
  
  // クッキー保存系
  EyeTracker.UserReadSpeed;

  // ====================================
  // ユーティリティ系
  // ====================================

  EyeTracker.getEyeWindowHeight = function(){
    if(EyeTracker.TouchMoving){
      return Math.max(EyeTracker.UpperSideHeight , EyeTracker.LowerSideHeight);
    }else{
      return window.innerHeight;
    }
  }
  
  EyeTracker.checkIfTouchOverlay = function(elem){
    if(EyeTracker.TouchMoving == false)
      return false;
      
      if(EyeTracker.TouchX - EyeTracker.FINGER_HEIGHT / 2 < elem.left + elem.width && EyeTracker.TouchX + EyeTracker.FINGER_HEIGHT / 2 > elem.left && EyeTracker.TouchY - EyeTracker.FINGER_HEIGHT / 2 < elem.top + elem.height && EyeTracker.TouchY + EyeTracker.FINGER_HEIGHT / 2 > elem.top){
        return true;
      }
  }

  // ====================================
  // ターゲットの取得
  // ====================================
  
  // ターゲットノードを取得
  EyeTracker.getTargetNodesBy = function(selector) {
    if ( selector == '' ) {
      return document.getElementsByTagName('*');
    } else {
      var nodes = [];
      var parents = document.querySelectorAll(selector);
      for (var i = 0; i < parents.length; i++) {
        nodes.push( parents[i] );
        var _nodes = parents[i].getElementsByTagName('*');
        for (var j = 0; j < _nodes.length; j++) {
          nodes.push( _nodes[j] );
        }
      }
      return nodes;
    }
  }

  // ターゲットとなるdivを取得
  EyeTracker.getTargetDivs = function(selector){
    var elems = EyeTracker.getTargetNodesBy(selector);
    for(var i=0; i<elems.length; i++){
      if ( elems[i].children.length == 0 && elems[i].innerText.length > 16) {
        var obj = elems[i].getBoundingClientRect();
        obj.watched_msec = 0;
        obj.div = elems[i];
         EyeTracker.TargetDivs.push(obj);
         EyeTracker.ViewRateArray.push(0);
         EyeTracker.RankArray.push(0);
         EyeTracker.ViewCountArray.push(0);
      }
    }
  }
  
  // ====================================
  // スクロールの判定
  // ====================================
  // 現在のスクロール量を取得
  EyeTracker.getScroll = function(){
     var sx, sy;
     if(window.pageYOffset!= undefined){
       sy = pageYOffset;
       sx = pageXOffset;
     }else{
       var d= document, r= d.documentElement, b= d.body;
       sx= r.scrollLeft || b.scrollLeft || 0;
       sy= r.scrollTop || b.scrollTop || 0;
     }
      return [sx, sy];
  }
  
  // 対象のelementが画面上から何％〜何％を占めているか
  EyeTracker.getDivViewAreaRate = function(boundObj){
    var topPercentage = 0;
    var topFromWindow = boundObj.top - EyeTracker.getScroll()[1];
    
    if(topFromWindow > 0){
      topPercentage = parseInt((parseFloat(topFromWindow) / parseFloat(window.innerHeight)) * 100);
    }
    
    var bottomPercentage = 0;
    var bottomFromWindow = boundObj.top + boundObj.height - EyeTracker.getScroll()[1];
    if(bottomFromWindow > 0){
      bottomPercentage = parseInt((parseFloat(bottomFromWindow) / parseFloat(window.innerHeight)) * 100);
    }
    
    var view_rate = 0;
    var correction = 0;
    // 補正
    if(parseInt(window.getComputedStyle(boundObj.div, null).getPropertyValue("font-size")) > 13){
      correction = 2;
    }
    
    for(var i=topPercentage - correction ; i<bottomPercentage + correction; i++){
      if(i < EyeTracker.ViewAreaRate[1] + correction && i > EyeTracker.ViewAreaRate[0] - correction){
        view_rate++;
      }
    }
    
    return view_rate;
  }
  
  // 視認している時間を重み付け
  EyeTracker.calcMsec = function(elem){
      var msec = parseInt(1000 / parseFloat(elem.innerText.length) );
    msec += parseInt(parseInt(window.getComputedStyle(elem, null).getPropertyValue("font-size")) / 3);
    if(elem.style.fontWeight == "bold"){
      msec += 10;
    }
    return msec;
  }
  
  EyeTracker.calcViewRateWeight = function(){
    var current_time = new Date();
    
    if(EyeTracker.CurrentViewedElementNum){
      EyeTracker.ViewMsec = EyeTracker.TargetDivs[EyeTracker.CurrentViewedElementNum].div.innerText.length *  20 + EyeTracker.DefaultViewMsec;

      // 読むスピードを測定
      if(current_time - EyeTracker.TargetDivs[EyeTracker.CurrentViewedElementNum].last_viewed_time > EyeTracker.DefaultViewMsec){
        var speed = EyeTracker.TargetDivs[EyeTracker.CurrentViewedElementNum].div.innerText.length / (current_time - EyeTracker.TargetDivs[EyeTracker.CurrentViewedElementNum].last_viewed_time) * 1000;
        EyeTracker.ViewSpeedArray.push(parseInt(speed));

        if(EyeTracker.ViewSpeedArray.length > 100){
          EyeTracker.ViewSpeedArray.pop();
        }
        var sum = EyeTracker.ViewSpeedArray.reduce(function(a, b) { return a + b; });
        EyeTracker.ViewSpeedAverage = sum / EyeTracker.ViewSpeedArray.length;
        
        // 記事への関心度を測定
        if(EyeTracker.ViewSpeedAverage < 25){
          EyeTracker.Interest = 3;
        }else if (EyeTracker.ViewSpeedAverage < 40){
          EyeTracker.Interest = 2;
        }else if (EyeTracker.ViewSpeedAverage < 70){
          EyeTracker.Interest = 1;
        }else{
          EyeTracker.Interest = 0;
        }
     }

     // 閾値以上であればちゃんと読んでいると、みなす
      if(current_time - EyeTracker.TargetDivs[EyeTracker.CurrentViewedElementNum].last_viewed_time > EyeTracker.ViewMsec + EyeTracker.DefaultViewMsec ){
        if(EyeTracker.CurrentViewedElementChanged == true){
          EyeTracker.ViewCountArray[EyeTracker.CurrentViewedElementNum] += 1;
          EyeTracker.CurrentViewedElementChanged = false;
        }
        EyeTracker.RankArray[EyeTracker.CurrentViewedElementNum] += EyeTracker.calcMsec(EyeTracker.TargetDivs[EyeTracker.CurrentViewedElementNum].div) * EyeTracker.ViewCountArray[EyeTracker.CurrentViewedElementNum];
        EyeTracker.CurrentConcentratedElementNum = EyeTracker.CurrentViewedElementNum;
      }
    }
  }
  
  // 最もランクの高いエレメントを取得
  EyeTracker.getMostViewedElements = function(){
    var highRankArray = EyeTracker.RankArray.slice();
    highRankArray.sort().reverse();

    var max_watched_msec = 0;
    var most_viewed_elements = [0,0,0];
    for(var i=0; i<EyeTracker.TargetDivs.length; i++){
      if(highRankArray[0] == EyeTracker.RankArray[i] && highRankArray[0] != 0){
        most_viewed_elements[0] = EyeTracker.TargetDivs[i];
      }
      if(highRankArray[1] == EyeTracker.RankArray[i] && highRankArray[1] != 0){
        most_viewed_elements[1] = EyeTracker.TargetDivs[i];
      }
      if(highRankArray[2] == EyeTracker.RankArray[i] && highRankArray[2] != 0){
        most_viewed_elements[2] = EyeTracker.TargetDivs[i];
      }
    }
    return most_viewed_elements;
  }

  // ====================================
  // タイマー処理
  // ====================================
  
  // タイマーをスタート
  EyeTracker.startTimer = function(){
    EyeTracker.Timer = setInterval(function(){

     var max_num = 0;
     var pre_viewed_element_num = EyeTracker.CurrentViewedElementNum;

      for(var i=0; i<EyeTracker.TargetDivs.length; i++){
        var div_view_rate = EyeTracker.getDivViewAreaRate(EyeTracker.TargetDivs[i]);
        EyeTracker.ViewRateArray[i] = div_view_rate;

        // Maxの視認率のdivを取得
        if(div_view_rate > max_num && !EyeTracker.checkIfTouchOverlay(EyeTracker.TargetDivs[i])){
          max_num = div_view_rate;
          EyeTracker.CurrentViewedElementNum = i;
        }
      }
      if(max_num == 0){
        EyeTracker.CurrentViewedElementNum = null;
      }
      
      if(EyeTracker.CurrentViewedElementNum != pre_viewed_element_num){
        EyeTracker.CurrentViewedElementChanged = true;
      }
      
      if(EyeTracker.CurrentViewedElementNum && pre_viewed_element_num != EyeTracker.CurrentViewedElementNum){
        EyeTracker.TargetDivs[EyeTracker.CurrentViewedElementNum].last_viewed_time = new Date();
      }
      EyeTracker.calcViewRateWeight();

      EyeTracker.MostViewedElements = EyeTracker.getMostViewedElements();

      EyeTracker.displayResult();
    }, 100);
  }
  
  // ====================================
  // タッチ系の解析
  // ====================================
  EyeTracker.touchMoved = function(e){
    EyeTracker.TouchMoving = true;
    var touchObj = e.changedTouches[0] ;
    var touchX = touchObj.pageX ;
    var touchY = touchObj.pageY ;
    EyeTracker.TouchX = touchX;
    EyeTracker.TouchY = touchY;

    if(touchX > window.innerWidth / 2.0){
      EyeTracker.TouchedSideCount[1] ++;
    }else{
      EyeTracker.TouchedSideCount[0] ++;
    }

    var sy;
    if(window.pageYOffset!= undefined){
      sy = pageYOffset;
    }else{
      var d= document, r= d.documentElement, b= d.body;
      sy= r.scrollTop || b.scrollTop || 0;
    }    
    EyeTracker.UpperSideHeight = touchY - sy - EyeTracker.FINGER_HEIGHT / 2.0;
    EyeTracker.LowerSideHeight = window.innerHeight - (touchY - sy + EyeTracker.FINGER_HEIGHT / 2.0);
    
    if(EyeTracker.TouchedSideCount[0] >= EyeTracker.TouchedSideCount[1]){
      EyeTracker.TouchedSide = "Left";
    }else{
      EyeTracker.TouchedSide = "Right";
    }
  }

  EyeTracker.run = function(){
    EyeTracker.getTargetDivs(EyeTracker .Selector);
    EyeTracker.startTimer();
    document.body.addEventListener('touchmove', function(e) {
      EyeTracker.touchMoved(e);
    });
    document.body.addEventListener('touchend', function(e) {
      EyeTracker.TouchMoving = false;
    });
  }
  
  EyeTracker.getCookieData = function(){
    if( localStorage.getItem("readspeed")){
     EyeTracker.UserReadSpeed = localStorage.getItem("readspeed");
    }
  }
  
  // ====================================
  // デバッグ用
  // ====================================
  EyeTracker.displayResult = function(){

    if(EyeTracker.Mode == "development"){
      for(var i=0;i<EyeTracker.TargetDivs.length;i++){
        EyeTracker.TargetDivs[i].div.style.background = "rgba(0,0,0,0)";
      }
      if(EyeTracker.TargetDivs[EyeTracker.CurrentViewedElementNum]){
        EyeTracker.TargetDivs[EyeTracker.CurrentViewedElementNum].div.style.background = "beige";
      }
      if(EyeTracker.TargetDivs[EyeTracker.CurrentConcentratedElementNum]){
        EyeTracker.TargetDivs[EyeTracker.CurrentConcentratedElementNum].div.style.background = "bisque";
      }
    }

     if(EyeTracker.MostViewedElements){
        var html_str = "";
        for(var i=0;i<EyeTracker.MostViewedElements.length;i++){
          if(EyeTracker.MostViewedElements[i] != 0)
            html_str += "<div>" +  (i + 1) + ". " + EyeTracker.MostViewedElements[i].div.innerText + "</div><br/>";
        }
        document.getElementById("output").innerHTML = html_str;
      }
      if(EyeTracker.TouchedSide == "Left"){
        document.getElementById("hand-output").innerHTML = "左手";
      }else{
        document.getElementById("hand-output").innerHTML = "右手";
      }
      document.getElementById("speed-output").innerHTML = "秒間 "+ parseInt(EyeTracker.ViewSpeedAverage) + "文字";
      
      if(EyeTracker.Interest == 0){
        document.getElementById("interest-output").innerHTML = "全くなし"
      }else if(EyeTracker.Interest == 1){
        document.getElementById("interest-output").innerHTML = "あまりなし"
      }else if(EyeTracker.Interest == 2){
        document.getElementById("interest-output").innerHTML = "若干高い"
      }else if(EyeTracker.Interest == 3){
        document.getElementById("interest-output").innerHTML = "高い"
      }
  }

})();

document.addEventListener('touchstart', function() {
  if( EyeTracker.Running == false){
    var url = window.location.href;
    if(url.indexOf("mode=debug") > -1){
      EyeTracker.Mode = "development";
    }
    EyeTracker.run();
    EyeTracker.Running = true;
  }
});