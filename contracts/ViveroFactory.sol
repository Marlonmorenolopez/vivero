// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  ViveroFactory.sol — Contrato Maestro (Factory Pattern)
//  Autor: Vivero Frailejones Web3
//  Version: 2.1.0
//
//  CAMBIOS v2.1.0 respecto a v2.0.0:
//  ✅ Agrega referencia a Vivero.sol como fuente de verdad central.
//  ✅ Al adoptar una semilla, también la registra en Vivero.sol
//     vía IVivero.registrarSemilla(), para que registrarTraslado()
//     y otras funciones de Vivero.sol encuentren el ID.
//  ✅ Nuevo parámetro en constructor: _viveroContrato
//  ✅ Nueva función admin: actualizarViveroContrato()
//  ✅ Nuevo evento: ViveroContratoActualizado
// ============================================================

import "./SemillaIndividual.sol";

// ─── Interfaz mínima de Vivero.sol para registrar semillas ───────────────────
interface IVivero {
    function registrarSemilla(
        string  memory _especie,
        string  memory _responsable,
        int256  _latitud,
        int256  _longitud,
        uint256 _altitud,
        string  memory _comentarios,
        address _contratoGemelo,
        address _adoptante
    ) external;
}

contract ViveroFactory {

    // ─── Wallets de destino inmutables ────────────────────────────────────
    address payable public immutable walletONG;
    address payable public immutable walletDesarrollador;

    // ─── Dirección del contrato Vivero.sol (registro central) ────────────
    address public viveroContrato;

    // ─── Precio base de adopción en wei ───────────────────────────────────
    uint256 public precioAdopcion;

    // ─── ID autoincremental ───────────────────────────────────────────────
    uint256 public totalSemillasAdoptadas;

    // ─── Mapping público: ID → dirección del contrato individual ─────────
    mapping(uint256 => address) public buscarContratoPorId;

    // ─── Owner para administración ────────────────────────────────────────
    address public owner;

    // ─── Eventos ──────────────────────────────────────────────────────────
    event SemillaAdoptada(
        uint256 indexed semillaId,
        address indexed contratoIndividual,
        address indexed adoptante,
        string  especie,
        string  responsable,
        int256  latitud,
        int256  longitud,
        uint256 altitud,
        uint256 montoONG,
        uint256 montoPlataforma,
        uint256 timestamp
    );
    event PrecioActualizado(uint256 nuevoPrecio);
    event ViveroContratoActualizado(address nuevoContrato);

    // ─── Modificadores ────────────────────────────────────────────────────
    modifier soloDueno() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esto");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────
    // NOTA: Ahora recibe _viveroContrato como 4° parámetro.
    // Pasar address(0) si aún no se tiene la dirección de Vivero.sol
    // y luego actualizarla con actualizarViveroContrato().
    constructor(
        address payable _walletONG,
        address payable _walletDesarrollador,
        uint256 _precioAdopcionWei,
        address _viveroContrato
    ) {
        require(_walletONG           != address(0), "Wallet ONG invalida");
        require(_walletDesarrollador != address(0), "Wallet desarrollador invalida");

        walletONG           = _walletONG;
        walletDesarrollador = _walletDesarrollador;
        precioAdopcion      = _precioAdopcionWei;
        viveroContrato      = _viveroContrato;  // puede ser address(0) si no hay aún
        owner               = msg.sender;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  FUNCIÓN PRINCIPAL: ADOPTAR SEMILLA
    //
    //  Flujo:
    //  1. Valida pago y parámetros
    //  2. Despliega SemillaIndividual (Gemelo Digital)
    //  3. Registra en el mapping interno
    //  4. Sincroniza con Vivero.sol (fuente de verdad central)
    //  5. Split de fondos: 95% ONG / 5% Plataforma
    // ─────────────────────────────────────────────────────────────────────
    function adoptarSemilla(
        string  memory _especie,
        string  memory _responsable,
        int256  _latitud,
        int256  _longitud,
        uint256 _altitud,
        string  memory _comentariosIniciales
    ) external payable returns (uint256 semillaId, address contratoIndividual) {

        require(msg.value >= precioAdopcion, "Fondos insuficientes para adoptar");

        require(
            keccak256(bytes(_especie)) == keccak256(bytes("Frailejon")) ||
            keccak256(bytes(_especie)) == keccak256(bytes("Cardones"))  ||
            keccak256(bytes(_especie)) == keccak256(bytes("Macolla"))   ||
            keccak256(bytes(_especie)) == keccak256(bytes("Bambues")),
            "Especie no valida. Usa: Frailejon, Cardones, Macolla, Bambues"
        );
        require(_latitud  >= -90000000  && _latitud  <= 90000000,  "Latitud fuera de rango");
        require(_longitud >= -180000000 && _longitud <= 180000000, "Longitud fuera de rango");
        require(_altitud  >= 2800       && _altitud  <= 4200,      "Altitud fuera de rango (2800-4200 m)");

        // ── 1. Autoincremento del ID ──────────────────────────────────────
        totalSemillasAdoptadas++;
        semillaId = totalSemillasAdoptadas;

        // ── 2. Desplegar el Gemelo Digital (SemillaIndividual) ───────────
        SemillaIndividual nuevoContrato = new SemillaIndividual(
            semillaId,
            _especie,
            _responsable,
            _latitud,
            _longitud,
            _altitud,
            _comentariosIniciales,
            msg.sender,
            walletONG,
            walletDesarrollador
        );
        contratoIndividual = address(nuevoContrato);

        // ── 3. Registrar en el mapping público ───────────────────────────
        buscarContratoPorId[semillaId] = contratoIndividual;

        // ── 4. Sincronizar con Vivero.sol (fuente de verdad central) ─────
        //      Solo se ejecuta si viveroContrato está configurado.
        //      REQUISITO: esta Factory debe estar registrada como admin
        //      en Vivero.sol antes de llamar adoptarSemilla().
        //      Usar el script deployFactory.js que hace esto automáticamente.
        if (viveroContrato != address(0)) {
            IVivero(viveroContrato).registrarSemilla(
                _especie,
                _responsable,
                _latitud,
                _longitud,
                _altitud,
                _comentariosIniciales,
                contratoIndividual,
                msg.sender
            );
        }

        // ── 5. Split de fondos: 95% ONG / 5% Plataforma ─────────────────
        uint256 montoTotal      = msg.value;
        uint256 montoPlataforma = (montoTotal * 5) / 100;
        uint256 montoONG        = montoTotal - montoPlataforma;

        (bool okONG,) = walletONG.call{value: montoONG}("");
        require(okONG, "Transferencia a ONG fallida");

        (bool okDev,) = walletDesarrollador.call{value: montoPlataforma}("");
        require(okDev, "Transferencia a Desarrollador fallida");

        emit SemillaAdoptada(
            semillaId,
            contratoIndividual,
            msg.sender,
            _especie,
            _responsable,
            _latitud,
            _longitud,
            _altitud,
            montoONG,
            montoPlataforma,
            block.timestamp
        );

        return (semillaId, contratoIndividual);
    }

    // ─── Consultas ────────────────────────────────────────────────────────

    /// Devuelve la dirección del contrato individual de una semilla
    function obtenerContrato(uint256 _semillaId) external view returns (address) {
        require(_semillaId > 0 && _semillaId <= totalSemillasAdoptadas, "ID de semilla invalido");
        return buscarContratoPorId[_semillaId];
    }

    /// Devuelve todos los contratos desplegados (para UI)
    function obtenerTodosLosContratos() external view returns (address[] memory) {
        address[] memory contratos = new address[](totalSemillasAdoptadas);
        for (uint256 i = 1; i <= totalSemillasAdoptadas; i++) {
            contratos[i - 1] = buscarContratoPorId[i];
        }
        return contratos;
    }

    // ─── Administración ───────────────────────────────────────────────────

    /// Actualizar la dirección de Vivero.sol si se redespliega ese contrato.
    /// También útil para apuntarla por primera vez si el constructor
    /// recibió address(0).
    function actualizarViveroContrato(address _nuevoVivero) external soloDueno {
        viveroContrato = _nuevoVivero;
        emit ViveroContratoActualizado(_nuevoVivero);
    }

    function actualizarPrecio(uint256 _nuevoPrecioWei) external soloDueno {
        precioAdopcion = _nuevoPrecioWei;
        emit PrecioActualizado(_nuevoPrecioWei);
    }

    function transferirPropiedad(address _nuevoDueno) external soloDueno {
        require(_nuevoDueno != address(0), "Direccion invalida");
        owner = _nuevoDueno;
    }

    /// Rescate de ETH que quede accidentalmente en la Factory
    function rescatarETH() external soloDueno {
        uint256 balance = address(this).balance;
        require(balance > 0, "Sin ETH para rescatar");
        (bool ok,) = walletDesarrollador.call{value: balance}("");
        require(ok, "Transferencia fallida");
    }

    receive() external payable {}
}
