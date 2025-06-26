extends VehicleBody3D

class_name CarController

# 車両の物理パラメータ
@export var engine_force_value: float = 150.0
@export var brake_force_value: float = 15.0
@export var steering_limit: float = 0.5
@export var steering_speed: float = 5.0

# 車両の状態
var current_steering: float = 0.0
var current_engine_force: float = 0.0
var current_brake_force: float = 0.0

# 車両の統計情報
var speed: float = 0.0
var distance_traveled: float = 0.0
var start_position: Vector3

# 車輪の参照
@onready var front_left_wheel: VehicleWheel3D = $FrontLeftWheel
@onready var front_right_wheel: VehicleWheel3D = $FrontRightWheel
@onready var rear_left_wheel: VehicleWheel3D = $RearLeftWheel
@onready var rear_right_wheel: VehicleWheel3D = $RearRightWheel

func _ready():
	start_position = global_position

func _physics_process(delta):
	# 入力の処理
	handle_input()
	
	# 車輪への力を適用
	apply_wheel_forces()
	
	# 統計情報の更新
	update_stats(delta)

func handle_input():
	# エンジンフォース（前進・後退）
	var input_forward = Input.get_action_strength("move_forward")
	var input_backward = Input.get_action_strength("move_backward")
	
	current_engine_force = (input_forward - input_backward) * engine_force_value
	
	# ブレーキ
	var input_brake = Input.get_action_strength("brake")
	current_brake_force = input_brake * brake_force_value
	
	# ハンドブレーキ
	var input_handbrake = Input.get_action_strength("handbrake")
	if input_handbrake > 0:
		current_brake_force += brake_force_value * 2.0
	
	# ステアリング
	var input_steering = Input.get_action_strength("turn_right") - Input.get_action_strength("turn_left")
	current_steering = move_toward(current_steering, input_steering * steering_limit, steering_speed * get_physics_process_delta_time())

func apply_wheel_forces():
	# 前輪のステアリング
	front_left_wheel.steering = current_steering
	front_right_wheel.steering = current_steering
	
	# 全輪にエンジンフォースを適用
	front_left_wheel.engine_force = current_engine_force
	front_right_wheel.engine_force = current_engine_force
	rear_left_wheel.engine_force = current_engine_force
	rear_right_wheel.engine_force = current_engine_force
	
	# 全輪にブレーキフォースを適用
	front_left_wheel.brake = current_brake_force
	front_right_wheel.brake = current_brake_force
	rear_left_wheel.brake = current_brake_force
	rear_right_wheel.brake = current_brake_force

func update_stats(delta):
	# 速度の計算
	speed = linear_velocity.length()
	
	# 移動距離の計算
	distance_traveled += speed * delta

func get_speed_kmh() -> float:
	return speed * 3.6

func get_distance_traveled() -> float:
	return distance_traveled

func reset_position():
	global_position = start_position
	linear_velocity = Vector3.ZERO
	angular_velocity = Vector3.ZERO
	distance_traveled = 0.0 