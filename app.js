let movimientos =
JSON.parse(localStorage.getItem("movimientos")) || [];

let chart;

function guardar(){
localStorage.setItem(
"movimientos",
JSON.stringify(movimientos)
);
}

function agregarMovimiento(){

const tipo =
document.getElementById("tipo").value;

const descripcion =
document.getElementById("descripcion").value;

const monto =
Number(document.getElementById("monto").value);

if(!descripcion || !monto){
alert("Completa todos los campos");
return;
}

movimientos.push({
tipo,
descripcion,
monto
});

guardar();

document.getElementById("descripcion").value="";
document.getElementById("monto").value="";

actualizarPantalla();
}

function eliminarMovimiento(index){

movimientos.splice(index,1);

guardar();

actualizarPantalla();
}

function actualizarPantalla(){

let ingresos = 0;
let gastos = 0;

const tbody =
document.getElementById("cuerpoMovimientos");

if(tbody){
tbody.innerHTML = "";
}

movimientos.forEach((m,index)=>{

if(m.tipo==="Ingreso"){
ingresos += m.monto;
}else{
gastos += m.monto;
}

if(tbody){

tbody.innerHTML += `
<tr>
<td>${m.tipo}</td>
<td>${m.descripcion}</td>
<td>$${m.monto.toLocaleString()}</td>
<td>
<button
class="delete-btn"
onclick="eliminarMovimiento(${index})">
Eliminar
</button>
</td>
</tr>
`;

}

});

document.getElementById("ingresos").innerText =
"$"+ingresos.toLocaleString();

document.getElementById("gastos").innerText =
"$"+gastos.toLocaleString();

document.getElementById("saldo").innerText =
"$"+(ingresos-gastos).toLocaleString();

document.getElementById("ahorro").innerText =
"$"+(ingresos-gastos).toLocaleString();

actualizarGrafico(ingresos,gastos);
}

function actualizarGrafico(
ingresos,
gastos
){

const canvas =
document.getElementById("grafico");

if(!canvas) return;

if(chart){
chart.destroy();
}

chart = new Chart(canvas,{
type:'doughnut',

data:{
labels:[
'Ingresos',
'Gastos'
],

datasets:[{
data:[
ingresos,
gastos
],

backgroundColor:[
'#22c55e',
'#ef4444'
]
}]
}
});
}

actualizarPantalla();
