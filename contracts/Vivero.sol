// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  Vivero.sol — Contrato Principal del Vivero de Frailejones
//  Version: 3.0.0 — Nombres alineados con Sepolia
//
//  Cambios v3.0.0:
//    · IdentidadSemilla → campos renombrados para coincidir con Sepolia:
//        especie           → tipo
//        latitudInicial    → ubicacionInicial.latitud  (struct UbicacionParamo)
//        longitudInicial   → ubicacionInicial.longitud (struct UbicacionParamo)
//        comentariosIniciales → comentariosDeCuidado
//        fechaAdopcion     → fechaRegistro.timestamp   (struct Timestamp)
//    · ReporteClimatico   → embebido como condicionesClimaticas en Semilla
//    · Traslado           → campos renombrados:
//        responsable       → responsableTraslado
//        comentarios       → comentariosDeCuidado
//        struct para ubicación: UbicacionParamo
//    · FaseCrecimiento    → campos renombrados:
//        estado            → estado (igual)
//        observaciones     → (conservado)
//        timestamp         → fechaActualizacion.timestamp (struct Timestamp)
//    · registrarTraslado  → registroTrasladoPlanta
//    · actualizarFaseCrecimiento → actualizarEstadoPlantaYCrecimiento
//    · obtenerFasesCrecimiento   → consultarHistorialCrecimiento
//    · registrarEventoClimatico  → 3 params (sin semillaId, es global)
//    · Nuevas funciones: eliminarSemilla, eliminarPlanta, totalPlantasRegistradas
// ============================================================

interface IForwarder {
    function getWorkflowMetadata() external view returns (
        address workflowOwner, bytes32 workflowName, bytes32 workflowId
    );
}

interface IGemeloDigital {
    function inyectarClima(
        int256 _temperatura, uint256 _humedadRelativa,
        uint256 _precipitacion, uint256 _horasLuzSolar
    ) external;

    function registrarTraslado(
        int256 _latitud, int256 _longitud, uint256 _altitud,
        string calldata _responsable, string calldata _comentarios
    ) external;

    function actualizarFaseCrecimiento(
        string calldata _estado, string calldata _observaciones
    ) external;

    function obtenerLeaderboard() external view returns (
        address[] memory billeteras,
        uint256[] memory montos,
        uint256[] memory numeroDonaciones
    );

    function obtenerResumen() external view returns (
        uint256 id, string memory especie, string memory responsable,
        int256 latitud, int256 longitud, uint256 altitud,
        uint256 totalReportes, uint256 totalTraslados,
        uint256 totalDonaciones, uint256 fechaAdopcion
    );

    function obtenerUltimoClima() external view returns (
        int256 temperatura, uint256 humedadRelativa,
        uint256 precipitacion, uint256 horasLuzSolar, uint256 timestamp
    );
}

contract Vivero {

    // ══════════════════════════════════════════════════════════════════════
    //  ESTRUCTURAS v3.0.0 — alineadas con Sepolia
    // ══════════════════════════════════════════════════════════════════════

    /// @dev Timestamp wrapper — igual que Sepolia
    struct Timestamp {
        uint256 timestamp;
    }

    /// @dev Ubicación GPS — igual que Sepolia
    struct UbicacionParamo {
        int256 latitud;   // GPS × 1_000_000
        int256 longitud;  // GPS × 1_000_000
    }

    /// @dev Condiciones climáticas embebidas — igual que Sepolia
    struct CondicionesClimaticas {
        int256 temperatura;      // × 10  (ej: 85 = 8.5°C)
        uint256 humedadRelativa; // 0-100
        uint256 precipitacion;   // mm × 10
        uint256 horasLuzSolar;   // 0-24
        uint256 altitud;         // msnm
        Timestamp fechaRegistro;
    }

    /// @dev Semilla — estructura principal alineada con Sepolia
    struct Semilla {
        uint256 id;
        string tipo;                          // antes: especie
        UbicacionParamo ubicacionInicial;     // antes: latitudInicial/longitudInicial
        string responsable;
        CondicionesClimaticas condicionesClimaticas;
        string comentariosDeCuidado;          // antes: comentariosIniciales
        Timestamp fechaRegistro;              // antes: fechaAdopcion
        // Campos extra de Ganache (no en Sepolia pero útiles localmente)
        address adoptante;
        address contratoGemelo;
    }

    /// @dev Traslado — estructura alineada con Sepolia
    struct TrasladoPlanta {
        uint256 id;
        uint256 idSemilla;
        string estado;
        UbicacionParamo ubicacionEnParamo;    // antes: latitud/longitud flat
        string responsableTraslado;           // antes: responsable
        string comentariosDeCuidado;          // antes: comentarios
        Timestamp fechaTraslado;              // antes: timestamp flat
    }

    /// @dev Fase de crecimiento — alineada con Sepolia
    struct HistorialCrecimiento {
        uint256 plantaId;                     // antes: semillaId
        string estado;
        Timestamp fechaActualizacion;         // antes: timestamp flat + observaciones
        // Conservamos observaciones para compatibilidad Ganache
        string observaciones;
    }

    /// @dev Reporte climático standalone (para historial)
    struct ReporteClimatico {
        int256 temperatura;
        uint256 humedadRelativa;
        uint256 precipitacion;
        uint256 horasLuzSolar;
        uint256 timestamp;
    }

    /// @dev Especie nativa — sin cambios
    struct EspecieNativa {
        uint256 id;
        string nombre;
        string descripcion;
        uint256 poblacionEstimada;
        uint256 timestamp;
    }

    /// @dev Evento climático — sin semillaId (alineado con Sepolia)
    struct EventoClimatico {
        uint256 id;
        string tipo;
        int256 temperatura;
        uint256 precipitacion;
        uint256 timestamp;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  VARIABLES DE ESTADO
    // ══════════════════════════════════════════════════════════════════════

    address public owner;
    bool public paused;

    address payable public immutable walletONG;
    address payable public immutable walletDesarrollador;

    uint256 public totalSemillasRegistradas;
    uint256 public totalPlantasRegistradas;      // antes: totalPlantasTrasladadasGlobal
    uint256 public totalEspeciesNativas;
    uint256 public totalEventosClimaticos;

    mapping(uint256 => Semilla)              private semillas;
    mapping(uint256 => ReporteClimatico[])   private historialClimatico;
    mapping(uint256 => ReporteClimatico)     private ultimoReportePorSemilla;
    mapping(uint256 => TrasladoPlanta[])     private historialTraslados;
    mapping(uint256 => HistorialCrecimiento[]) private fasesDeCrecimiento;
    mapping(uint256 => EspecieNativa)        private especiesNativas;
    mapping(uint256 => EventoClimatico)      private eventosClimaticos;
    mapping(address => bool)                 public administradores;

    // ══════════════════════════════════════════════════════════════════════
    //  EVENTOS
    // ══════════════════════════════════════════════════════════════════════

    event SemillaRegistrada(
        uint256 indexed semillaId, address indexed contratoGemelo,
        address indexed adoptante, string tipo, string responsable,
        int256 latitud, int256 longitud, uint256 altitud, uint256 timestamp
    );
    event ClimaInyectado(
        uint256 indexed semillaId, int256 temperatura, uint256 humedad,
        uint256 precipitacion, uint256 horasLuz, uint256 timestamp
    );
    event TrasladoRegistrado(
        uint256 indexed semillaId, int256 latitud, int256 longitud,
        uint256 altitud, string responsable, uint256 timestamp
    );
    event FaseCrecimientoActualizada(
        uint256 indexed semillaId, string estado, uint256 timestamp
    );
    event EspecieNativaRegistrada(
        uint256 indexed id, string nombre, uint256 poblacionEstimada, uint256 timestamp
    );
    event EventoClimaticoRegistrado(
        uint256 indexed id, string tipo,
        int256 temperatura, uint256 precipitacion, uint256 timestamp
    );
    event AlertaClimatica(uint256 indexed semillaId, string alerta, int256 valor);
    event AccesoNoAutorizado(address indexed quien, string accion);

    // ══════════════════════════════════════════════════════════════════════
    //  MODIFICADORES
    // ══════════════════════════════════════════════════════════════════════

    modifier soloDueno() {
        if (msg.sender != owner) {
            emit AccesoNoAutorizado(msg.sender, "Intento de modificacion");
            revert("Solo el owner puede ejecutar esto");
        }
        _;
    }
    modifier soloAdminODueno() {
        require(msg.sender == owner || administradores[msg.sender],
            "Se requieren permisos de administrador");
        _;
    }
    modifier whenNotPaused() {
        require(!paused, "El contrato esta pausado");
        _;
    }
    modifier semillaExiste(uint256 _id) {
        require(_id > 0 && _id <= totalSemillasRegistradas, "ID de semilla invalido");
        _;
    }
    modifier especieValida(string memory _tipo) {
        require(
            keccak256(bytes(_tipo)) == keccak256(bytes("Frailejon")) ||
            keccak256(bytes(_tipo)) == keccak256(bytes("Cardones"))  ||
            keccak256(bytes(_tipo)) == keccak256(bytes("Macolla"))   ||
            keccak256(bytes(_tipo)) == keccak256(bytes("Bambues")),
            "Especie no valida. Usa: Frailejon, Cardones, Macolla, Bambues"
        );
        _;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════

    constructor(address payable _walletONG, address payable _walletDesarrollador) {
        require(_walletONG != address(0), "Wallet ONG invalida");
        require(_walletDesarrollador != address(0), "Wallet desarrollador invalida");
        owner = _walletDesarrollador;
        walletONG = _walletONG;
        walletDesarrollador = _walletDesarrollador;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  REGISTRO DE SEMILLA
    // ══════════════════════════════════════════════════════════════════════

    function registrarSemilla(
        string memory _tipo,
        string memory _responsable,
        int256 _latitud,
        int256 _longitud,
        uint256 _altitud,
        string memory _comentarios,
        address _contratoGemelo,
        address _adoptante
    ) external soloAdminODueno whenNotPaused especieValida(_tipo) {
        require(_latitud  >= -90_000_000  && _latitud  <= 90_000_000,  "Latitud fuera de rango");
        require(_longitud >= -180_000_000 && _longitud <= 180_000_000, "Longitud fuera de rango");
        require(_altitud  >= 2800 && _altitud <= 4200, "Altitud fuera de rango (2800-4200 m)");
        require(_contratoGemelo != address(0), "Direccion de gemelo invalida");
        require(_adoptante      != address(0), "Direccion de adoptante invalida");

        totalSemillasRegistradas++;
        uint256 nuevoId = totalSemillasRegistradas;

        semillas[nuevoId] = Semilla({
            id:      nuevoId,
            tipo:    _tipo,
            ubicacionInicial: UbicacionParamo({ latitud: _latitud, longitud: _longitud }),
            responsable: _responsable,
            condicionesClimaticas: CondicionesClimaticas({
                temperatura: 0, humedadRelativa: 0, precipitacion: 0,
                horasLuzSolar: 0, altitud: _altitud,
                fechaRegistro: Timestamp({ timestamp: block.timestamp })
            }),
            comentariosDeCuidado: _comentarios,
            fechaRegistro: Timestamp({ timestamp: block.timestamp }),
            adoptante:     _adoptante,
            contratoGemelo: _contratoGemelo
        });

        fasesDeCrecimiento[nuevoId].push(HistorialCrecimiento({
            plantaId:           nuevoId,
            estado:             "Semilla",
            fechaActualizacion: Timestamp({ timestamp: block.timestamp }),
            observaciones:      _comentarios
        }));

        emit SemillaRegistrada(nuevoId, _contratoGemelo, _adoptante, _tipo,
            _responsable, _latitud, _longitud, _altitud, block.timestamp);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  INYECCIÓN CLIMÁTICA
    // ══════════════════════════════════════════════════════════════════════

    function inyectarClima(
        uint256 _semillaId,
        int256  _temperatura,
        uint256 _humedadRelativa,
        uint256 _precipitacion,
        uint256 _horasLuzSolar
    ) external soloAdminODueno whenNotPaused semillaExiste(_semillaId) {
        require(_humedadRelativa <= 100, "Humedad fuera de rango (0-100)");

        // Actualizar condicionesClimaticas en la semilla
        semillas[_semillaId].condicionesClimaticas = CondicionesClimaticas({
            temperatura:    _temperatura,
            humedadRelativa: _humedadRelativa,
            precipitacion:  _precipitacion,
            horasLuzSolar:  _horasLuzSolar,
            altitud:        semillas[_semillaId].condicionesClimaticas.altitud,
            fechaRegistro:  Timestamp({ timestamp: block.timestamp })
        });

        ReporteClimatico memory reporte = ReporteClimatico({
            temperatura: _temperatura, humedadRelativa: _humedadRelativa,
            precipitacion: _precipitacion, horasLuzSolar: _horasLuzSolar,
            timestamp: block.timestamp
        });
        historialClimatico[_semillaId].push(reporte);
        ultimoReportePorSemilla[_semillaId] = reporte;

        address gemelo = semillas[_semillaId].contratoGemelo;
        if (gemelo != address(0)) {
            IGemeloDigital(gemelo).inyectarClima(
                _temperatura, _humedadRelativa, _precipitacion, _horasLuzSolar
            );
        }

        _verificarAlertas(_semillaId, _temperatura, _humedadRelativa);
        emit ClimaInyectado(_semillaId, _temperatura, _humedadRelativa,
            _precipitacion, _horasLuzSolar, block.timestamp);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  TRASLADOS — registroTrasladoPlanta (alineado con Sepolia)
    // ══════════════════════════════════════════════════════════════════════

    function registroTrasladoPlanta(
        uint256 _idSemilla,
        UbicacionParamo memory _ubicacionEnParamo,
        string memory _responsableTraslado,
        string memory _comentariosDeCuidado
    ) external soloAdminODueno whenNotPaused semillaExiste(_idSemilla) {
        require(
            _ubicacionEnParamo.latitud  >= -90_000_000  &&
            _ubicacionEnParamo.latitud  <= 90_000_000,  "Latitud fuera de rango");
        require(
            _ubicacionEnParamo.longitud >= -180_000_000 &&
            _ubicacionEnParamo.longitud <= 180_000_000, "Longitud fuera de rango");

        totalPlantasRegistradas++;
        uint256 nuevoIdTraslado = totalPlantasRegistradas;

        historialTraslados[_idSemilla].push(TrasladoPlanta({
            id:                 nuevoIdTraslado,
            idSemilla:          _idSemilla,
            estado:             "Trasladada",
            ubicacionEnParamo:  _ubicacionEnParamo,
            responsableTraslado: _responsableTraslado,
            comentariosDeCuidado: _comentariosDeCuidado,
            fechaTraslado:      Timestamp({ timestamp: block.timestamp })
        }));

        address gemelo = semillas[_idSemilla].contratoGemelo;
        if (gemelo != address(0)) {
            IGemeloDigital(gemelo).registrarTraslado(
                _ubicacionEnParamo.latitud, _ubicacionEnParamo.longitud,
                semillas[_idSemilla].condicionesClimaticas.altitud,
                _responsableTraslado, _comentariosDeCuidado
            );
        }

        emit TrasladoRegistrado(_idSemilla, _ubicacionEnParamo.latitud,
            _ubicacionEnParamo.longitud,
            semillas[_idSemilla].condicionesClimaticas.altitud,
            _responsableTraslado, block.timestamp);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  FASES — actualizarEstadoPlantaYCrecimiento (alineado con Sepolia)
    // ══════════════════════════════════════════════════════════════════════

    function actualizarEstadoPlantaYCrecimiento(
        uint256 _idPlanta,
        string memory _nuevoEstado
    ) external soloAdminODueno whenNotPaused semillaExiste(_idPlanta) {
        fasesDeCrecimiento[_idPlanta].push(HistorialCrecimiento({
            plantaId:           _idPlanta,
            estado:             _nuevoEstado,
            fechaActualizacion: Timestamp({ timestamp: block.timestamp }),
            observaciones:      ""
        }));

        address gemelo = semillas[_idPlanta].contratoGemelo;
        if (gemelo != address(0)) {
            IGemeloDigital(gemelo).actualizarFaseCrecimiento(_nuevoEstado, "");
        }

        emit FaseCrecimientoActualizada(_idPlanta, _nuevoEstado, block.timestamp);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  BIODIVERSIDAD
    // ══════════════════════════════════════════════════════════════════════

    function registrarEspecieNativa(
        string memory _nombre,
        string memory _descripcion,
        uint256 _poblacionEstimada
    ) external soloAdminODueno whenNotPaused {
        require(bytes(_nombre).length > 0, "Nombre de especie vacio");
        totalEspeciesNativas++;
        especiesNativas[totalEspeciesNativas] = EspecieNativa({
            id: totalEspeciesNativas, nombre: _nombre, descripcion: _descripcion,
            poblacionEstimada: _poblacionEstimada, timestamp: block.timestamp
        });
        emit EspecieNativaRegistrada(totalEspeciesNativas, _nombre,
            _poblacionEstimada, block.timestamp);
    }

    // Sin semillaId — alineado con Sepolia (3 params)
    function registrarEventoClimatico(
        string memory _tipo,
        int256 _temperatura,
        uint256 _precipitacion
    ) external soloAdminODueno whenNotPaused {
        require(bytes(_tipo).length > 0, "Tipo de evento vacio");
        totalEventosClimaticos++;
        eventosClimaticos[totalEventosClimaticos] = EventoClimatico({
            id: totalEventosClimaticos, tipo: _tipo,
            temperatura: _temperatura, precipitacion: _precipitacion,
            timestamp: block.timestamp
        });
        emit EventoClimaticoRegistrado(totalEventosClimaticos, _tipo,
            _temperatura, _precipitacion, block.timestamp);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  ELIMINACIÓN — igual que Sepolia
    // ══════════════════════════════════════════════════════════════════════

    function eliminarSemilla(uint256 _idSemilla) external soloDueno semillaExiste(_idSemilla) {
        delete semillas[_idSemilla];
    }

    function eliminarPlanta(uint256 _idPlanta) external soloDueno {
        require(_idPlanta > 0 && _idPlanta <= totalPlantasRegistradas, "ID planta invalido");
        // Eliminar traslado del historial no es posible con mapping,
        // pero se puede marcar el estado como eliminado
        // Para compatibilidad con Sepolia simplemente decrementamos
        if (totalPlantasRegistradas > 0) totalPlantasRegistradas--;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  ALERTAS INTERNAS
    // ══════════════════════════════════════════════════════════════════════

    function _verificarAlertas(uint256 _semillaId, int256 _temp, uint256 _hum) internal {
        if (_temp < -50) emit AlertaClimatica(_semillaId, "Temperatura critica bajo -5C", _temp);
        if (_temp > 150) emit AlertaClimatica(_semillaId, "Temperatura alta para paramo", _temp);
        if (_hum  < 50)  emit AlertaClimatica(_semillaId, "Humedad critica para frailejones", int256(_hum));
    }

    // ══════════════════════════════════════════════════════════════════════
    //  GETTERS — alineados con Sepolia
    // ══════════════════════════════════════════════════════════════════════

    function obtenerSemilla(uint256 _idSemilla)
        external view semillaExiste(_idSemilla) returns (Semilla memory) {
        return semillas[_idSemilla];
    }

    function trasladoPlanta(uint256 _idPlanta)
        external view returns (TrasladoPlanta memory) {
        // Devuelve el último traslado de la semilla con ese ID
        require(_idPlanta > 0 && _idPlanta <= totalSemillasRegistradas, "ID invalido");
        TrasladoPlanta[] storage ts = historialTraslados[_idPlanta];
        require(ts.length > 0, "Sin traslados");
        return ts[ts.length - 1];
    }

    function consultarHistorialCrecimiento(uint256 _idPlanta)
        external view semillaExiste(_idPlanta)
        returns (HistorialCrecimiento[] memory) {
        return fasesDeCrecimiento[_idPlanta];
    }

    function obtenerTodasLasSemillas()
        external view returns (Semilla[] memory) {
        Semilla[] memory todas = new Semilla[](totalSemillasRegistradas);
        for (uint256 i = 1; i <= totalSemillasRegistradas; i++) {
            todas[i - 1] = semillas[i];
        }
        return todas;
    }

    function buscarSemillasPorResponsable(string memory _responsable)
        external view
        returns (uint256[] memory ids, Semilla[] memory encontradas) {
        uint256 count = 0;
        for (uint256 i = 1; i <= totalSemillasRegistradas; i++) {
            if (keccak256(bytes(semillas[i].responsable)) == keccak256(bytes(_responsable)))
                count++;
        }
        ids       = new uint256[](count);
        encontradas = new Semilla[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= totalSemillasRegistradas; i++) {
            if (keccak256(bytes(semillas[i].responsable)) == keccak256(bytes(_responsable))) {
                ids[idx]        = i;
                encontradas[idx] = semillas[i];
                idx++;
            }
        }
    }

    function obtenerEstadisticasParamo()
        external view
        returns (
            uint256 _totalSemillas,
            uint256 _totalPlantas,
            uint256 _totalEspeciesNativas,
            uint256 _totalEventosClimaticos
        ) {
        return (
            totalSemillasRegistradas,
            totalPlantasRegistradas,
            totalEspeciesNativas,
            totalEventosClimaticos
        );
    }

    function obtenerUltimoClima(uint256 _id)
        external view semillaExiste(_id)
        returns (ReporteClimatico memory) {
        return ultimoReportePorSemilla[_id];
    }

    function obtenerHistorialClimatico(uint256 _id)
        external view semillaExiste(_id)
        returns (ReporteClimatico[] memory) {
        return historialClimatico[_id];
    }

    function obtenerHistorialTraslados(uint256 _id)
        external view semillaExiste(_id)
        returns (TrasladoPlanta[] memory) {
        return historialTraslados[_id];
    }

    function obtenerEspecieNativa(uint256 _id)
        external view returns (EspecieNativa memory) {
        require(_id > 0 && _id <= totalEspeciesNativas, "ID de especie invalido");
        return especiesNativas[_id];
    }

    function obtenerEventoClimatico(uint256 _id)
        external view returns (EventoClimatico memory) {
        require(_id > 0 && _id <= totalEventosClimaticos, "ID de evento invalido");
        return eventosClimaticos[_id];
    }

    function obtenerLeaderboard(uint256 _semillaId)
        external view semillaExiste(_semillaId)
        returns (address[] memory billeteras, uint256[] memory montos, uint256[] memory numeroDonaciones) {
        address gemelo = semillas[_semillaId].contratoGemelo;
        require(gemelo != address(0), "Gemelo Digital no vinculado");
        return IGemeloDigital(gemelo).obtenerLeaderboard();
    }

    function obtenerResumen(uint256 _id)
        external view semillaExiste(_id)
        returns (
            uint256 id, string memory tipo, string memory responsable,
            int256 latitud, int256 longitud, uint256 altitud,
            uint256 totalReportes, uint256 totalTraslados, uint256 totalFases,
            uint256 fechaAdopcion, address contratoGemelo, address adoptante
        ) {
        Semilla storage s = semillas[_id];
        return (
            s.id, s.tipo, s.responsable,
            s.ubicacionInicial.latitud, s.ubicacionInicial.longitud,
            s.condicionesClimaticas.altitud,
            historialClimatico[_id].length,
            historialTraslados[_id].length,
            fasesDeCrecimiento[_id].length,
            s.fechaRegistro.timestamp,
            s.contratoGemelo,
            s.adoptante
        );
    }

    // ══════════════════════════════════════════════════════════════════════
    //  ADMINISTRACIÓN
    // ══════════════════════════════════════════════════════════════════════

    function transferirPropiedad(address _nuevoDueno) external soloDueno {
        require(_nuevoDueno != address(0), "Direccion invalida");
        owner = _nuevoDueno;
    }
    function agregarAdministrador(address _admin) external soloDueno {
        require(_admin != address(0), "Direccion invalida");
        administradores[_admin] = true;
    }
    function removerAdministrador(address _admin) external soloDueno {
        administradores[_admin] = false;
    }
    function pausar()    external soloDueno { paused = true;  }
    function despausar() external soloDueno { paused = false; }
    function rescatarETH() external soloDueno {
        uint256 bal = address(this).balance;
        require(bal > 0, "Sin ETH para rescatar");
        (bool ok, ) = walletDesarrollador.call{value: bal}("");
        require(ok, "Transferencia fallida");
    }

    receive() external payable {}
}
