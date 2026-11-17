let movimientos =
JSON.parse(localStorage.getItem("movimientos")) || [];

function guardar(){
 localStorage.setItem(
   "movimientos",
   JSON.stringify(movimientos)
 );
}

function agregarMovimiento(){

 let tipo =
 document.getElementById("tipo").value;

 let descripcion =
 document.getElementById("descripcion").value;

 let monto =
 Number(
 document.getElementById("monto").value
 );

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
 actualizarPantalla();

 document.getElementById("descripcion").value="";
 document.getElementById("monto").value="";
}

function actualizarPantalla(){

 let ingresos = 0;
 let gastos = 0;

 movimientos.forEach(m=>{

   if(m.tipo==="Ingreso"){
      ingresos += m.monto;
   }else{
      gastos += m.monto;
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
}

actualizarPantalla();
