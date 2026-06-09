// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  SemillaIndividual.sol — Gemelo Digital por Semilla
//  Autor: Vivero Frailejones Web3
//  Version: 2.1.0 (Direct Wallet Ownership)
// ============================================================

interface IForwarder {
    function getWorkflowMetadata() external view returns (
        address workflowOwner,
        bytes32 workflowName,
        bytes32 workflowId
    );
}

contract SemillaIndividual {

    // ─── Estructuras ──────────────────────────────────────────────────────

    struct IdentidadSemilla {
        uint256 id;
        string  especie;
        string  responsable;
        int256  latitudInicial;
        int256  longitudInicial;
        uint256 altitud;
        string  comentariosIniciales;
        address adoptante;
        uint256 fechaAdopcion;
    }

    struct ReporteClimatico {
        int256  temperatura;      // × 10 (ej: 85 = 8.5°C)
        uint256 humedadRelativa;  // porcentaje 0-100
        uint256 precipitacion;    // mm × 10
        uint256 horasLuzSolar;    // horas estimadas
        uint256 timestamp;
    }

    struct Traslado {
        int256  latitud;
        int256  longitud;
        uint256 altitud;
        string  responsable;
        string  comentarios;
        uint256 timestamp;
    }

    struct FaseCrecimiento {
        string  estado;           // "Germinacion", "Plántula", "Juvenil", "Adulto"
        string  observaciones;
        uint256 timestamp;
    }

    struct Donante {
        address billetera;
        uint256 totalDonado;   // en wei
        uint256 numeroDonaciones;
    }

    // ─── Variables de estado ──────────────────────────────────────────────

    IdentidadSemilla  public identidad;

    // Wallets de destino (heredadas de la Factory)
    address payable public immutable walletONG;
    address payable public immutable walletDesarrollador;

    // Oráculo CRE
    address public creForwarder;
    address public owner;

    // Historial climático dinámico
    ReporteClimatico[]         public historialClimatico;
    ReporteClimatico           public ultimoReporte;

    // Historial de traslados
    Traslado[]                 public historialTraslados;

    // Fases de crecimiento
    FaseCrecimiento[]          public fasesDeCrecimiento;

    // Cuadro de Honor (Leaderboard de Padrinos)
    mapping(address => uint256) public donadoPorBilletera;
    address[]                   public listaDonantes;
    uint256                     public totalDonacionesRecibidas;
    uint256                     public totalReportesClimaticos;

    // ─── Eventos ──────────────────────────────────────────────────────────
    event ClimaInyectado(
        uint256 indexed semillaId,
        int256  temperatura,
        uint256 humedad,
        uint256 precipitacion,
        uint256 horasLuz,
        uint256 timestamp
    );
    event TrasladoRegistrado(
        uint256 indexed semillaId,
        int256  latitud,
        int256  longitud,
        uint256 altitud,
        string  responsable,
        uint256 timestamp
    );
    event DonacionRecibida(
        uint256 indexed semillaId,
        address indexed donante,
        uint256 monto,
        uint256 montoONG,
        uint256 montoPlataforma,
        uint256 timestamp
    );
    event FaseCrecimientoActualizada(
        uint256 indexed semillaId,
        string  estado,
        uint256 timestamp
    );
    event ForwarderActualizado(address nuevoForwarder);

    // ─── Modificadores ────────────────────────────────────────────────────
    modifier soloDueno() {
        require(msg.sender == owner, "Solo el owner");
        _;
    }

    modifier soloForwarder() {
        require(
            msg.sender == creForwarder || msg.sender == owner,
            "Solo el Forwarder CRE u owner puede inyectar clima"
        );
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────
    constructor(
        uint256 _id,
        string  memory _especie,
        string  memory _responsable,
        int256  _latitud,
        int256  _longitud,
        uint256 _altitud,
        string  memory _comentariosIniciales,
        address _adoptante,
        address payable _walletONG,
        address payable _walletDesarrollador
    ) {
        // 🔑 CORREGIDO: Se le otorga la propiedad directa a la billetera de desarrollo (servidor/oráculo)
        owner               = _walletDesarrollador; 
        walletONG           = _walletONG;
        walletDesarrollador = _walletDesarrollador;

        identidad = IdentidadSemilla({
            id:                    _id,
            especie:               _especie,
            responsable:           _responsable,
            latitudInicial:        _latitud,
            longitudInicial:       _longitud,
            altitud:               _altitud,
            comentariosIniciales:  _comentariosIniciales,
            adoptante:             _adoptante,
            fechaAdopcion:         block.timestamp
        });

        fasesDeCrecimiento.push(FaseCrecimiento({
            estado:        "Semilla",
            observaciones: _comentariosIniciales,
            timestamp:     block.timestamp
        }));
    }

    // ─────────────────────────────────────────────────────────────────────
    //  INYECCIÓN CLIMÁTICA (Oráculo CRE o owner manual)
    // ─────────────────────────────────────────────────────────────────────
    function inyectarClima(
        int256  _temperatura,
        uint256 _humedadRelativa,
        uint256 _precipitacion,
        uint256 _horasLuzSolar
    ) external soloForwarder {

        ReporteClimatico memory reporte = ReporteClimatico({
            temperatura:     _temperatura,
            humedadRelativa: _humedadRelativa,
            precipitacion:   _precipitacion,
            horasLuzSolar:   _horasLuzSolar,
            timestamp:       block.timestamp
        });

        historialClimatico.push(reporte);
        ultimoReporte = reporte;
        totalReportesClimaticos++;

        emit ClimaInyectado(
            identidad.id,
            _temperatura,
            _humedadRelativa,
            _precipitacion,
            _horasLuzSolar,
            block.timestamp
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    //  REGISTRAR TRASLADO GEOGRÁFICO
    // ─────────────────────────────────────────────────────────────────────
    function registrarTraslado(
        int256  _latitud,
        int256  _longitud,
        uint256 _altitud,
        string  memory _responsable,
        string  memory _comentarios
    ) external soloDueno {
        require(_latitud  >= -90000000  && _latitud  <= 90000000,  "Latitud fuera de rango");
        require(_longitud >= -180000000 && _longitud <= 180000000, "Longitud fuera de rango");

        historialTraslados.push(Traslado({
            latitud:     _latitud,
            longitud:    _longitud,
            altitud:     _altitud,
            responsable: _responsable,
            comentarios: _comentarios,
            timestamp:   block.timestamp
        }));

        emit TrasladoRegistrado(
            identidad.id,
            _latitud,
            _longitud,
            _altitud,
            _responsable,
            block.timestamp
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    //  ACTUALIZAR FASE DE CRECIMIENTO
    // ─────────────────────────────────────────────────────────────────────
    function actualizarFaseCrecimiento(
        string memory _estado,
        string memory _observaciones
    ) external soloDueno {
        fasesDeCrecimiento.push(FaseCrecimiento({
            estado:        _estado,
            observaciones: _observaciones,
            timestamp:     block.timestamp
        }));

        emit FaseCrecimientoActualizada(identidad.id, _estado, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────
    //  DONACIÓN PARA MANTENIMIENTO (Cuadro de Honor)
    // ─────────────────────────────────────────────────────────────────────
    function donarParaMantenimiento() external payable {
        require(msg.value > 0, "La donacion debe ser mayor a cero");

        uint256 montoTotal      = msg.value;
        uint256 montoPlataforma = (montoTotal * 3) / 100;
        uint256 montoONG        = montoTotal - montoPlataforma;

        if (donadoPorBilletera[msg.sender] == 0) {
            listaDonantes.push(msg.sender);
        }
        donadoPorBilletera[msg.sender] += montoTotal;
        totalDonacionesRecibidas       += montoTotal;

        (bool okONG,) = walletONG.call{value: montoONG}("");
        require(okONG, "Transferencia a ONG fallida");

        (bool okDev,) = walletDesarrollador.call{value: montoPlataforma}("");
        require(okDev, "Transferencia a Plataforma fallida");

        emit DonacionRecibida(
            identidad.id,
            msg.sender,
            montoTotal,
            montoONG,
            montoPlataforma,
            block.timestamp
        );
    }

    // ─── CONSULTAS PÚBLICAS ───────────────────────────────────────────────

    function obtenerIdentidad() external view returns (IdentidadSemilla memory) {
        return identidad;
    }

    function obtenerHistorialClimatico() external view returns (ReporteClimatico[] memory) {
        return historialClimatico;
    }

    function obtenerHistorialTraslados() external view returns (Traslado[] memory) {
        return historialTraslados;
    }

    function obtenerFasesCrecimiento() external view returns (FaseCrecimiento[] memory) {
        return fasesDeCrecimiento;
    }

    function obtenerUltimoClima() external view returns (ReporteClimatico memory) {
        return ultimoReporte;
    }

    function obtenerLeaderboard() external view returns (
        address[] memory billeteras,
        uint256[] memory montos,
        uint256[] memory numeroDonaciones
    ) {
        uint256 n = listaDonantes.length;
        billeteras       = new address[](n);
        montos           = new uint256[](n);
        numeroDonaciones = new uint256[](n);

        for (uint256 i = 0; i < n; i++) {
            billeteras[i]       = listaDonantes[i];
            montos[i]           = donadoPorBilletera[listaDonantes[i]];
            numeroDonaciones[i] = montos[i] > 0 ? 1 : 0;
        }
        return (billeteras, montos, numeroDonaciones);
    }

    function obtenerResumen() external view returns (
        uint256 id,
        string  memory especie,
        string  memory responsable,
        int256  latitud,
        int256  longitud,
        uint256 altitud,
        uint256 totalReportes,
        uint256 totalTraslados,
        uint256 totalDonaciones,
        uint256 fechaAdopcion
    ) {
        return (
            identidad.id,
            identidad.especie,
            identidad.responsable,
            identidad.latitudInicial,
            identidad.longitudInicial,
            identidad.altitud,
            totalReportesClimaticos,
            historialTraslados.length,
            totalDonacionesRecibidas,
            identidad.fechaAdopcion
        );
    }

    function climaEsReciente() external view returns (bool) {
        if (ultimoReporte.timestamp == 0) return false;
        return (block.timestamp - ultimoReporte.timestamp) < 1 hours;
    }

    // ─── Administración ───────────────────────────────────────────────────

    function configurarForwarder(address _nuevoForwarder) external soloDueno {
        require(_nuevoForwarder != address(0), "Direccion invalida");
        creForwarder = _nuevoForwarder;
        emit ForwarderActualizado(_nuevoForwarder);
    }

    function transferirPropiedad(address _nuevoDueno) external soloDueno {
        require(_nuevoDueno != address(0), "Direccion invalida");
        owner = _nuevoDueno;
    }
}