/* =====================================================
   THERMPYX
   ZEROTH LAW OF THERMODYNAMICS

   Particle Thermal Simulation

   A ↔ C ↔ B

===================================================== */


/* ===============================
   STATE
================================ */

let running = false;


let temperatureA = 80;

let temperatureB = 20;

let temperatureC = 50;







/* ===============================
   ELEMENT
================================ */

const canvasA = document.getElementById("canvasA");
const canvasB = document.getElementById("canvasB");


const ctxA = canvasA.getContext("2d");
const ctxB = canvasB.getContext("2d");


canvasA.width = 300;
canvasA.height = 240;

canvasB.width = 300;
canvasB.height = 240;





const tempADisplay =
document.getElementById("tempADisplay");


const tempBDisplay =
document.getElementById("tempBDisplay");


const thermoDisplay =
document.getElementById("thermoDisplay");



const tempAInput =
document.getElementById("tempAInput");


const tempBInput =
document.getElementById("tempBInput");


const thermoInput =
document.getElementById("thermoInput");




const tempAValue =
document.getElementById("tempAValue");


const tempBValue =
document.getElementById("tempBValue");


const thermoValue =
document.getElementById("thermoValue");





const dataA =
document.getElementById("dataA");


const dataB =
document.getElementById("dataB");


const dataThermo =
document.getElementById("dataThermo");


const deltaT =
document.getElementById("deltaT");




const thermometerLiquid =
document.getElementById("thermometerLiquid");



const statusBadge =
document.getElementById("statusBadge");


const lawResult =
document.getElementById("lawResult");


const heatArrow =
document.getElementById("heatArrow");


const heatText =
document.getElementById("heatText");





const startBtn =
document.getElementById("startBtn");


const pauseBtn =
document.getElementById("pauseBtn");


const resetBtn =
document.getElementById("resetBtn");








/* ===============================
   PARTICLE
================================ */

class Particle {


    constructor(){

        this.x =
        Math.random()*300;


        this.y =
        Math.random()*240;


        this.radius = 4;



        let angle =
        Math.random()*Math.PI*2;


        this.vx =
        Math.cos(angle);


        this.vy =
        Math.sin(angle);


    }




    move(speed){


        this.x += this.vx * speed;

        this.y += this.vy * speed;



        if(this.x <= 0 || this.x >= 300){

            this.vx *= -1;

        }



        if(this.y <=0 || this.y >=240){

            this.vy *= -1;

        }


    }





    draw(ctx,color){


        ctx.beginPath();


        ctx.arc(
            this.x,
            this.y,
            this.radius,
            0,
            Math.PI*2
        );


        ctx.fillStyle = color;


        ctx.fill();


    }


}









/* ===============================
   THERMAL SYSTEM
================================ */


class ThermalSystem {


    constructor(canvas,temp){


        this.canvas = canvas;

        this.ctx =
        canvas.getContext("2d");


        this.temperature = temp;


        this.particles = [];



        for(let i=0;i<60;i++){


            this.particles.push(
                new Particle()
            );


        }


    }





    setTemperature(value){

        this.temperature = value;

    }





    getSpeed(){


        /*
        Hubungan sederhana:
        suhu naik = energi kinetik naik

        */


        return (

            0.5 +

            (this.temperature / 100) * 3

        );


    }






    getColor(){


        if(this.temperature >= 70){

            return "#ef4444";

        }



        if(this.temperature >= 40){

            return "#f97316";

        }



        return "#38bdf8";


    }







    update(){


        let speed =
        this.getSpeed();



        this.particles.forEach(
            particle=>{

                particle.move(speed);

            }
        );


    }







    draw(){


        this.ctx.clearRect(
            0,
            0,
            300,
            240
        );



        this.particles.forEach(
            particle=>{

                particle.draw(
                    this.ctx,
                    this.getColor()
                );

            }
        );


    }


}








/* ===============================
   CREATE SYSTEM
================================ */


const systemA =
new ThermalSystem(
    canvasA,
    temperatureA
);



const systemB =
new ThermalSystem(
    canvasB,
    temperatureB
);









/* ===============================
   HEAT TRANSFER
================================ */


function thermalProcess(){


    if(!running)

        return;




    /*
       Sistem A menuju C
    */

    temperatureA +=
    (
        temperatureC -
        temperatureA

    ) * 0.025;







    /*
       Sistem B menuju C
    */

    temperatureB +=
    (
        temperatureC -
        temperatureB

    ) * 0.025;







    /*
       Sistem C sebagai mediator

    */


    temperatureC +=

    (
        (
            temperatureA +
            temperatureB

        ) / 2

        -
        temperatureC

    ) * 0.02;





    systemA.setTemperature(
        temperatureA
    );


    systemB.setTemperature(
        temperatureB
    );



    updateDisplay();


}






setInterval(
    thermalProcess,
    50
);










/* ===============================
   UPDATE DISPLAY
================================ */


function updateDisplay(){


    tempADisplay.textContent =
    temperatureA.toFixed(1)+" °C";


    tempBDisplay.textContent =
    temperatureB.toFixed(1)+" °C";


    thermoDisplay.textContent =
    temperatureC.toFixed(1)+" °C";





    tempAValue.textContent =
    temperatureA.toFixed(0)+" °C";


    tempBValue.textContent =
    temperatureB.toFixed(0)+" °C";


    thermoValue.textContent =
    temperatureC.toFixed(0)+" °C";






    dataA.textContent =
    temperatureA.toFixed(1)+" °C";


    dataB.textContent =
    temperatureB.toFixed(1)+" °C";


    dataThermo.textContent =
    temperatureC.toFixed(1)+" °C";







    let diff =

    Math.max(
        temperatureA,
        temperatureB,
        temperatureC
    )

    -

    Math.min(
        temperatureA,
        temperatureB,
        temperatureC
    );



    deltaT.textContent =
    diff.toFixed(1)+" °C";





    thermometerLiquid.style.height =

    temperatureC+"%";





    updateBoxEffect();


    checkEquilibrium();


}








/* ===============================
   BOX EFFECT
================================ */


function updateBoxEffect(){


    const boxA =
    document.getElementById("boxA");


    const boxB =
    document.getElementById("boxB");



    boxA.classList.remove(
        "hot",
        "cold"
    );


    boxB.classList.remove(
        "hot",
        "cold"
    );



    if(temperatureA >= 60){

        boxA.classList.add("hot");

    }



    if(temperatureB <= 40){

        boxB.classList.add("cold");

    }


}









/* ===============================
   EQUILIBRIUM
================================ */


function checkEquilibrium(){



    let equal =

    Math.abs(
        temperatureA -
        temperatureC

    ) < 0.5


    &&


    Math.abs(
        temperatureB -
        temperatureC

    ) < 0.5;





    if(equal){


        statusBadge.textContent =
        "✓ Setimbang";


        statusBadge.classList.add(
            "equal"
        );



        heatArrow.textContent =
        "Q = 0";



        heatText.textContent =

        "Tidak ada perpindahan kalor bersih.";





        lawResult.innerHTML =

        `
        Kesetimbangan termal tercapai.
        <br><br>
        TA = TC = TB
        <br><br>
        Hukum 0 Termodinamika terpenuhi.
        `;



    }else{


        statusBadge.textContent =
        "Belum Setimbang";


        statusBadge.classList.remove(
            "equal"
        );



        heatArrow.textContent =
        "A → C ← B";


        heatText.textContent =

        "Kalor berpindah sampai temperatur semua sistem sama.";


        lawResult.textContent =

        "Sistem masih mengalami perpindahan kalor.";

    }


}









/* ===============================
   BUTTON
================================ */


startBtn.onclick = ()=>{


    running = true;


};




pauseBtn.onclick = ()=>{


    running = false;


};






resetBtn.onclick = ()=>{


    running = false;


    temperatureA = 80;

    temperatureB = 20;

    temperatureC = 50;



    tempAInput.value = 80;

    tempBInput.value = 20;

    thermoInput.value = 50;



    updateDisplay();


};









/* ===============================
   SLIDER
================================ */


tempAInput.oninput = function(){


    temperatureA =
    Number(this.value);


    updateDisplay();


};





tempBInput.oninput = function(){


    temperatureB =
    Number(this.value);


    updateDisplay();


};






thermoInput.oninput = function(){


    temperatureC =
    Number(this.value);


    updateDisplay();


};










/* ===============================
   CANVAS LOOP
================================ */


function animate(){


    systemA.update();

    systemB.update();



    systemA.draw();

    systemB.draw();



    requestAnimationFrame(
        animate
    );


}



animate();








/* Theme controls live in "ui.js".
   This file only handles the thermal simulation. */

/* INITIAL */

updateDisplay();